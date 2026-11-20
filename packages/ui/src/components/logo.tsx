import { type ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        data-slot="logo-sutradhar-top"
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M14.5 2C18.64 2 22 5.36 22 9.5c0 3.12-1.91 5.79-4.63 6.89l-2.02-1.74C17.13 13.9 18.5 11.86 18.5 9.5 18.5 7.29 16.71 5.5 14.5 5.5c-1.82 0-3.34 1.21-3.81 2.87l-2.73-.8C8.84 4.54 11.43 2 14.5 2z"
        fill="var(--icon-weak-base)"
      />
      <path
        data-slot="logo-sutradhar-bottom"
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M9.5 22C5.36 22 2 18.64 2 14.5c0-3.12 1.91-5.79 4.63-6.89l2.02 1.74C6.87 10.1 5.5 12.14 5.5 14.5 5.5 16.71 7.29 18.5 9.5 18.5c1.82 0 3.34-1.21 3.81-2.87l2.73.8C15.16 19.46 12.57 22 9.5 22z"
        fill="var(--icon-strong-base)"
      />
      <path
        data-slot="logo-sutradhar-bindu"
        d="M11.11 9.28l1.78 1.44-1.78 1.44a2 2 0 1 1 0-2.88z"
        fill="var(--icon-strong-base)"
      />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Subtle outer prana aura */}
      <circle cx="40" cy="50" r="34" stroke="var(--icon-weak-base)" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.3" />
      <circle cx="40" cy="50" r="28" stroke="var(--icon-base)" stroke-width="0.8" opacity="0.2" />

      {/* Main Sutradhar Emblem - centered at (40, 50) */}
      <g transform="translate(13.6, 23.6) scale(2.2)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M14.5 2C18.64 2 22 5.36 22 9.5c0 3.12-1.91 5.79-4.63 6.89l-2.02-1.74C17.13 13.9 18.5 11.86 18.5 9.5 18.5 7.29 16.71 5.5 14.5 5.5c-1.82 0-3.34 1.21-3.81 2.87l-2.73-.8C8.84 4.54 11.43 2 14.5 2z"
          fill="var(--icon-base)"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M9.5 22C5.36 22 2 18.64 2 14.5c0-3.12 1.91-5.79 4.63-6.89l2.02 1.74C6.87 10.1 5.5 12.14 5.5 14.5 5.5 16.71 7.29 18.5 9.5 18.5c1.82 0 3.34-1.21 3.81-2.87l2.73.8C15.16 19.46 12.57 22 9.5 22z"
          fill="var(--icon-strong-base)"
        />
        <path
          d="M11.11 9.28l1.78 1.44-1.78 1.44a2 2 0 1 1 0-2.88z"
          fill="var(--icon-strong-base)"
        />
      </g>
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <g transform="translate(6, 4) scale(1.4)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M14.5 2C18.64 2 22 5.36 22 9.5c0 3.12-1.91 5.79-4.63 6.89l-2.02-1.74C17.13 13.9 18.5 11.86 18.5 9.5 18.5 7.29 16.71 5.5 14.5 5.5c-1.82 0-3.34 1.21-3.81 2.87l-2.73-.8C8.84 4.54 11.43 2 14.5 2z"
          fill="var(--icon-weak-base)"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M9.5 22C5.36 22 2 18.64 2 14.5c0-3.12 1.91-5.79 4.63-6.89l2.02 1.74C6.87 10.1 5.5 12.14 5.5 14.5 5.5 16.71 7.29 18.5 9.5 18.5c1.82 0 3.34-1.21 3.81-2.87l2.73.8C15.16 19.46 12.57 22 9.5 22z"
          fill="var(--icon-strong-base)"
        />
        <path
          d="M11.11 9.28l1.78 1.44-1.78 1.44a2 2 0 1 1 0-2.88z"
          fill="var(--icon-strong-base)"
        />
      </g>
      <text
        x="48"
        y="26"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
        font-size="20"
        font-weight="700"
        letter-spacing="0.22em"
        fill="var(--icon-strong-base)"
      >
        SUTRADHAR
      </text>
      <text
        x="49"
        y="36"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
        font-size="8"
        font-weight="500"
        letter-spacing="0.28em"
        fill="var(--icon-weak-base)"
      >
        INTELLIGENT WORKSPACE
      </text>
    </svg>
  )
}
