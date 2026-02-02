import { memo } from "react";
import { IconButton } from "../commons/IconButton";
import type { PlayPauseButtonProps } from "./types";

export const PlayPauseButton = memo(
  ({ id, position, size, playing, onInteract }: PlayPauseButtonProps) => {
    return (
      <IconButton
        id={id}
        position={position}
        size={size}
        icon={playing ? "||" : "▶"}
        interactionText={playing ? "一時停止" : "再生"}
        onInteract={onInteract}
      />
    );
  },
);

PlayPauseButton.displayName = "PlayPauseButton";
