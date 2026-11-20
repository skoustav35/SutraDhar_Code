import { AgentV2 } from "@sutradhar/core/agent"
import { AISDK } from "@sutradhar/core/aisdk"
import { Catalog } from "@sutradhar/core/catalog"
import { CommandV2 } from "@sutradhar/core/command"
import { Credential } from "@sutradhar/core/credential"
import { AppNodeBuilder } from "@sutradhar/core/effect/app-node-builder"
import { LayerNodePlatform } from "@sutradhar/core/effect/app-node-platform"
import { LayerNode } from "@sutradhar/core/effect/layer-node"
import { EventV2 } from "@sutradhar/core/event"
import { FileSystem } from "@sutradhar/core/filesystem"
import { FSUtil } from "@sutradhar/core/fs-util"
import { Integration } from "@sutradhar/core/integration"
import { Location } from "@sutradhar/core/location"
import { Npm } from "@sutradhar/core/npm"
import { PluginV2 } from "@sutradhar/core/plugin"
import { Reference } from "@sutradhar/core/reference"
import { SkillV2 } from "@sutradhar/core/skill"
import { Effect, Layer } from "effect"
import { tempLocationLayer } from "../fixture/location"

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: () => Effect.succeed({ directory: "", entrypoint: undefined }),
    install: () => Effect.void,
    which: () => Effect.succeed(undefined),
  }),
)

export const PluginTestLayer = AppNodeBuilder.build(
  LayerNode.group([
    FileSystem.node,
    FSUtil.node,
    Location.node,
    Npm.node,
    Credential.node,
    EventV2.node,
    LayerNodePlatform.httpClient,
    PluginV2.node,
    AgentV2.node,
    AISDK.node,
    Catalog.node,
    CommandV2.node,
    Integration.node,
    Reference.node,
    SkillV2.node,
  ]),
  [
    [Location.node, tempLocationLayer],
    [Npm.node, npmLayer],
  ],
)
