import { Button } from "@cartography-lab/ui";

type DeletePaletteDialogProps = {
  open: boolean;
  paletteName: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeletePaletteDialog({
  open,
  paletteName,
  onCancel,
  onConfirm,
}: DeletePaletteDialogProps) {
  if (!open) return null;

  return (
    <div
      className="palette-delete-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="palette-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="palette-delete-title"
        aria-describedby="palette-delete-body"
      >
        <h3 className="palette-delete-dialog__title" id="palette-delete-title">
          Delete color?
        </h3>
        <p className="palette-delete-dialog__body" id="palette-delete-body">
          If you continue, the selected color theme
          {paletteName ? ` “${paletteName}”` : ""} will get lost forever.
        </p>
        <div className="palette-delete-dialog__actions">
          <Button variant="secondary" size="md" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="button" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
