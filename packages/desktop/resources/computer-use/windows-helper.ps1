$ErrorActionPreference = "Stop"

Add-Type -AssemblyName UIAutomationClient | Out-Null
Add-Type -AssemblyName UIAutomationTypes | Out-Null
Add-Type -AssemblyName System.Windows.Forms | Out-Null
Add-Type -AssemblyName System.Drawing | Out-Null
$drawingReferences = @([System.Drawing.Bitmap].Assembly.Location, [System.Windows.Forms.Form].Assembly.Location)

Add-Type -ReferencedAssemblies $drawingReferences -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public static class SutradharWin32
{
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr extraData);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxLength);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int maxLength);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
    [DllImport("user32.dll")] public static extern uint SendInput(uint count, INPUT[] inputs, int size);

    public const int SW_RESTORE = 9;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
    public const uint MOUSEEVENTF_WHEEL = 0x0800;
    public const uint INPUT_KEYBOARD = 1;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const uint KEYEVENTF_UNICODE = 0x0004;

    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort Vk; public ushort Scan; public uint Flags; public uint Time; public UIntPtr ExtraInfo; }
    [StructLayout(LayoutKind.Explicit)] public struct INPUTUNION { [FieldOffset(0)] public KEYBDINPUT Keyboard; }
    [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint Type; public INPUTUNION Union; }

    public static string WindowText(IntPtr hWnd)
    {
        var builder = new StringBuilder(1024);
        GetWindowText(hWnd, builder, builder.Capacity);
        return builder.ToString();
    }

    public static string WindowClass(IntPtr hWnd)
    {
        var builder = new StringBuilder(512);
        GetClassName(hWnd, builder, builder.Capacity);
        return builder.ToString();
    }

    public static string CaptureRegion(int x, int y, int width, int height)
    {
        if (width <= 0 || height <= 0) return "";
        using (var bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.CopyFromScreen(x, y, 0, 0, new Size(width, height), CopyPixelOperation.SourceCopy);
            }
            using (var stream = new MemoryStream())
            {
                bitmap.Save(stream, ImageFormat.Png);
                return Convert.ToBase64String(stream.ToArray());
            }
        }
    }

    public static void SendUnicodeText(string value)
    {
        foreach (var character in value)
        {
            var down = new INPUT { Type = INPUT_KEYBOARD, Union = new INPUTUNION { Keyboard = new KEYBDINPUT { Scan = character, Flags = KEYEVENTF_UNICODE } } };
            var up = new INPUT { Type = INPUT_KEYBOARD, Union = new INPUTUNION { Keyboard = new KEYBDINPUT { Scan = character, Flags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP } } };
            SendInput(1, new[] { down }, Marshal.SizeOf(typeof(INPUT)));
            SendInput(1, new[] { up }, Marshal.SizeOf(typeof(INPUT)));
        }
    }

    public static void SendVirtualKey(ushort value, bool keyUp)
    {
        var input = new INPUT { Type = INPUT_KEYBOARD, Union = new INPUTUNION { Keyboard = new KEYBDINPUT { Vk = value, Flags = keyUp ? KEYEVENTF_KEYUP : 0 } } };
        SendInput(1, new[] { input }, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@ | Out-Null

$TreeScopeChildren = [System.Windows.Automation.TreeScope]::Children
$TreeScopeDescendants = [System.Windows.Automation.TreeScope]::Descendants
$TrueCondition = [System.Windows.Automation.Condition]::TrueCondition
$maxNodes = 400

function RectToObject($rect) {
    if ($null -eq $rect) { return $null }
    return [ordered]@{
        x = [int]$rect.X
        y = [int]$rect.Y
        width = [int]$rect.Width
        height = [int]$rect.Height
    }
}

function Get-WindowBounds([IntPtr]$handle) {
    $rect = New-Object SutradharWin32+RECT
    if (-not [SutradharWin32]::GetWindowRect($handle, [ref]$rect)) { return $null }
    return [ordered]@{
        x = [int]$rect.Left
        y = [int]$rect.Top
        width = [int]($rect.Right - $rect.Left)
        height = [int]($rect.Bottom - $rect.Top)
    }
}

function Get-WindowId($handle) {
    return [string]$handle
}

function Resolve-Window($value) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value) -or [string]$value -eq "focused-window") {
        return [SutradharWin32]::GetForegroundWindow()
    }

    $parsed = 0L
    if ([long]::TryParse([string]$value, [ref]$parsed)) { return [IntPtr]$parsed }

    $needle = ([string]$value).ToLowerInvariant()
    $found = [IntPtr]::Zero
    $callback = [SutradharWin32+EnumWindowsProc]{
        param($handle, $extra)
        if (-not [SutradharWin32]::IsWindowVisible($handle)) { return $true }
        $title = [SutradharWin32]::WindowText($handle)
        if ($title.ToLowerInvariant().Contains($needle)) {
            $script:found = $handle
            return $false
        }
        return $true
    }
    [SutradharWin32]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
    if ($found -eq [IntPtr]::Zero) { throw "Desktop window not found: $value" }
    return $found
}

function Get-Windows {
    $items = New-Object System.Collections.Generic.List[object]
    $callback = [SutradharWin32+EnumWindowsProc]{
        param($handle, $extra)
        if (-not [SutradharWin32]::IsWindowVisible($handle)) { return $true }
        $title = [SutradharWin32]::WindowText($handle)
        if ([string]::IsNullOrWhiteSpace($title)) { return $true }
        $processId = 0
        [SutradharWin32]::GetWindowThreadProcessId($handle, [ref]$processId) | Out-Null
        $items.Add([ordered]@{
            id = [string]$handle
            title = $title
            className = [SutradharWin32]::WindowClass($handle)
            processId = [int]$processId
            bounds = Get-WindowBounds $handle
            focused = ($handle -eq [SutradharWin32]::GetForegroundWindow())
        })
        return $true
    }
    [SutradharWin32]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
    return $items.ToArray()
}

function PatternActions($element) {
    $actions = New-Object System.Collections.Generic.List[string]
    foreach ($pattern in @(
        [System.Windows.Automation.InvokePattern]::Pattern,
        [System.Windows.Automation.ValuePattern]::Pattern,
        [System.Windows.Automation.SelectionItemPattern]::Pattern,
        [System.Windows.Automation.ExpandCollapsePattern]::Pattern,
        [System.Windows.Automation.TogglePattern]::Pattern,
        [System.Windows.Automation.ScrollItemPattern]::Pattern,
        [System.Windows.Automation.RangeValuePattern]::Pattern
    )) {
        try {
            $value = $null
            if ($element.TryGetCurrentPattern($pattern, [ref]$value)) {
                $actions.Add($pattern.ProgrammaticName)
            }
        } catch {}
    }
    return @($actions)
}

function Get-Node($element, [int[]]$path, [int]$depth, [System.Collections.Generic.List[object]]$nodes) {
    if ($nodes.Count -ge $maxNodes -or $depth -gt 6) { return }
    try {
        $current = $element.Current
        $name = [string]$current.Name
        $role = [string]$current.ControlType.ProgrammaticName
        $value = ""
        try {
            $valuePattern = $null
            if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)) {
                $value = [string]$valuePattern.Current.Value
            }
        } catch {}
        $actions = PatternActions $element
        if (-not [string]::IsNullOrWhiteSpace($name) -or -not [string]::IsNullOrWhiteSpace($value) -or $actions.Count -gt 0) {
            $nodes.Add([ordered]@{
                path = @($path)
                name = $name
                role = $role
                value = $value
                automationId = [string]$current.AutomationId
                enabled = [bool]$current.IsEnabled
                bounds = RectToObject $current.BoundingRectangle
                actions = @($actions)
            })
        }
        $children = $element.FindAll($TreeScopeChildren, $TrueCondition)
        for ($index = 0; $index -lt $children.Count; $index++) {
            if ($nodes.Count -ge $maxNodes) { break }
            Get-Node $children.Item($index), (@($path) + $index), ($depth + 1), $nodes
        }
    } catch {}
}

function Observe-Window($handle, [bool]$includeScreenshot) {
    $element = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
    if ($null -eq $element) { throw "The target window is not accessible" }
    $nodes = New-Object System.Collections.Generic.List[object]
    Get-Node $element @() 0 $nodes
    $bounds = Get-WindowBounds $handle
    $screenshot = $null
    if ($includeScreenshot -and $null -ne $bounds) {
        $data = [SutradharWin32]::CaptureRegion($bounds.x, $bounds.y, $bounds.width, $bounds.height)
        if (-not [string]::IsNullOrWhiteSpace($data)) {
            $screenshot = [ordered]@{ data = $data; mime = "image/png"; filename = "desktop.png" }
        }
    }
    return [ordered]@{
        window = [ordered]@{
            id = [string]$handle
            title = [SutradharWin32]::WindowText($handle)
            className = [SutradharWin32]::WindowClass($handle)
            bounds = $bounds
            focused = ($handle -eq [SutradharWin32]::GetForegroundWindow())
        }
        nodes = $nodes.ToArray()
        screenshot = $screenshot
    }
}

function Resolve-Element($handle, $path) {
    $element = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
    if ($null -eq $element) { throw "The target window is not accessible" }
    foreach ($index in @($path)) {
        $children = $element.FindAll($TreeScopeChildren, $TrueCondition)
        if ($index -lt 0 -or $index -ge $children.Count) { throw "The desktop target is stale" }
        $element = $children.Item([int]$index)
    }
    return $element
}

function Invoke-Element($element) {
    $pattern = $null
    if ($element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
        $pattern.Invoke()
        return
    }
    $rect = $element.Current.BoundingRectangle
    if ($rect.Width -le 0 -or $rect.Height -le 0) { throw "The desktop target has no clickable bounds" }
    [SutradharWin32]::SetCursorPos([int]($rect.X + ($rect.Width / 2)), [int]($rect.Y + ($rect.Height / 2))) | Out-Null
    [SutradharWin32]::mouse_event([SutradharWin32]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
    [SutradharWin32]::mouse_event([SutradharWin32]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
}

function Send-Key($key, $modifiers) {
    $codes = @{
        Enter = 0x0D; Tab = 0x09; Escape = 0x1B; Backspace = 0x08; Delete = 0x2E
        ArrowUp = 0x26; ArrowDown = 0x28; ArrowLeft = 0x25; ArrowRight = 0x27
        Home = 0x24; End = 0x23; PageUp = 0x21; PageDown = 0x22; Space = 0x20
        Control = 0x11; Alt = 0x12; Shift = 0x10; Meta = 0x5B
    }
    $modMap = @{ Control = 0x11; Alt = 0x12; Shift = 0x10; Meta = 0x5B }
    $pressed = New-Object System.Collections.Generic.List[int]
    foreach ($modifier in @($modifiers)) {
        if ($modMap.ContainsKey([string]$modifier)) {
            $code = [int]$modMap[[string]$modifier]
            [SutradharWin32]::SendVirtualKey([uint16]$code, $false)
            $pressed.Add($code)
        }
    }
    $code = if ($codes.ContainsKey([string]$key)) { [int]$codes[[string]$key] } elseif ([string]$key -match "^[a-zA-Z0-9]$") { [int][char]([string]$key).ToUpperInvariant() } else { throw "Unsupported key: $key" }
    [SutradharWin32]::SendVirtualKey([uint16]$code, $false)
    [SutradharWin32]::SendVirtualKey([uint16]$code, $true)
    for ($index = $pressed.Count - 1; $index -ge 0; $index--) { [SutradharWin32]::SendVirtualKey([uint16]$pressed[$index], $true) }
}

function Process-Request($request) {
    switch ([string]$request.command) {
        "health" { return [ordered]@{ backend = "windows-uia"; version = 1; actions = @("windows", "observe", "focus", "click", "type", "key", "scroll", "drag", "wait") } }
        "windows" { return [ordered]@{ windows = Get-Windows } }
        "observe" {
            $handle = Resolve-Window $request.window
            return Observe-Window $handle ([bool]$request.includeScreenshot)
        }
        "focus" {
            $handle = Resolve-Window $request.window
            [SutradharWin32]::ShowWindow($handle, [SutradharWin32]::SW_RESTORE) | Out-Null
            [SutradharWin32]::SetForegroundWindow($handle) | Out-Null
            return @{ focused = Get-WindowId $handle }
        }
        "click" {
            $handle = Resolve-Window $request.window
            if ($null -ne $request.path) { Invoke-Element (Resolve-Element $handle $request.path) }
            else {
                [SutradharWin32]::SetCursorPos([int]$request.x, [int]$request.y) | Out-Null
                $down = if ([string]$request.button -eq "right") { [SutradharWin32]::MOUSEEVENTF_RIGHTDOWN } elseif ([string]$request.button -eq "middle") { [SutradharWin32]::MOUSEEVENTF_MIDDLEDOWN } else { [SutradharWin32]::MOUSEEVENTF_LEFTDOWN }
                $up = if ([string]$request.button -eq "right") { [SutradharWin32]::MOUSEEVENTF_RIGHTUP } elseif ([string]$request.button -eq "middle") { [SutradharWin32]::MOUSEEVENTF_MIDDLEUP } else { [SutradharWin32]::MOUSEEVENTF_LEFTUP }
                $count = [Math]::Max(1, [Math]::Min(2, [int]$request.clickCount))
                for ($i = 0; $i -lt $count; $i++) { [SutradharWin32]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero); [SutradharWin32]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 40 }
            }
            return @{ clicked = $true }
        }
        "type" { [SutradharWin32]::SendUnicodeText([string]$request.text); return @{ typed = $true } }
        "key" { Send-Key ([string]$request.key) $request.modifiers; return @{ pressed = $true } }
        "scroll" { [SutradharWin32]::mouse_event([SutradharWin32]::MOUSEEVENTF_WHEEL, 0, 0, [uint32][int]$request.deltaY, [UIntPtr]::Zero); return @{ scrolled = $true } }
        "drag" {
            $path = @($request.path)
            if ($path.Count -lt 2) { throw "Drag path must contain at least two points" }
            $first = $path[0]
            [SutradharWin32]::SetCursorPos([int]$first.x, [int]$first.y) | Out-Null
            [SutradharWin32]::mouse_event([SutradharWin32]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
            foreach ($point in $path) { [SutradharWin32]::SetCursorPos([int]$point.x, [int]$point.y) | Out-Null; Start-Sleep -Milliseconds 12 }
            [SutradharWin32]::mouse_event([SutradharWin32]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
            return @{ dragged = $true }
        }
        default { throw "Unsupported helper command: $($request.command)" }
    }
}

while ($true) {
    $line = [Console]::ReadLine()
    if ($null -eq $line) { break }
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try {
        $request = $line | ConvertFrom-Json
        $result = Process-Request $request
        [Console]::WriteLine((([ordered]@{ id = [string]$request.id; ok = $true; data = $result }) | ConvertTo-Json -Compress -Depth 20))
    } catch {
        [Console]::WriteLine((([ordered]@{ id = [string]$request.id; ok = $false; error = $_.Exception.Message }) | ConvertTo-Json -Compress -Depth 20))
    }
    [Console]::Out.Flush()
}
