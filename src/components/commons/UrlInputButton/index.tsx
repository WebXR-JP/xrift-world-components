import { memo, useCallback } from "react";
import { IconButton } from "../IconButton";
import { useTextInputContext } from "../../../contexts/TextInputContext";

export interface UrlInputButtonProps {
  id: string;
  position: [number, number, number];
  size: number;
  currentUrl: string;
  onUrlChange: (url: string) => void;
  /** 入力フィールドのプレースホルダー（デフォルト: '動画のURLを入力'） */
  placeholder?: string;
}

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
