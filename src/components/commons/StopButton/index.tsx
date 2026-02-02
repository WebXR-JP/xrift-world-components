import { memo } from "react";
import { IconButton } from "../IconButton";

export interface StopButtonProps {
  id: string;
  position: [number, number, number];
  size: number;
  onInteract: () => void;
}

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
