import { memo, useCallback } from "react";
import { IconButton } from "../commons/IconButton";
import { useTextInputContext } from "../../contexts/TextInputContext";
import type { UrlInputButtonProps } from "./types";

export const UrlInputButton = memo(
  ({
    id,
    position,
    size,
    currentUrl,
    onUrlChange,
    placeholder = "動画のURLを入力",
  }: UrlInputButtonProps) => {
    const { requestTextInput } = useTextInputContext();

    const handleInteract = useCallback(() => {
      requestTextInput({
        id: `${id}-url-input`,
        placeholder,
        initialValue: currentUrl,
        onSubmit: (value) => {
          if (value && value.trim() !== "") {
            onUrlChange(value.trim());
          }
        },
      });
    }, [id, currentUrl, onUrlChange, requestTextInput, placeholder]);

    return (
      <IconButton
        id={id}
        position={position}
        size={size}
        icon="🔗"
        interactionText="URL変更"
        onInteract={handleInteract}
      />
    );
  },
);

UrlInputButton.displayName = "UrlInputButton";
