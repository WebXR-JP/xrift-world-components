import { memo } from "react";
import { IconButton } from "../commons/IconButton";
import type { StopButtonProps } from "./types";

export const StopButton = memo(
  ({ id, position, size, onInteract }: StopButtonProps) => {
    return (
      <IconButton
        id={id}
        position={position}
        size={size}
        icon="■"
        interactionText="停止"
        onInteract={onInteract}
      />
    );
  },
);

StopButton.displayName = "StopButton";
