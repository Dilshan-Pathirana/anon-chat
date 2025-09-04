import React from "react";

interface Props {
  onEsc: () => void;
  onSkip: () => void;
}

const ActionBar: React.FC<Props> = ({ onEsc, onSkip }) => (
  <div className="flex justify-end gap-2 p-2 border-t">
    <button
      onClick={onEsc}
      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
    >
      ESC
    </button>
    <button
      onClick={onSkip}
      className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
    >
      SKIP
    </button>
  </div>
);

export default ActionBar;
