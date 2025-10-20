import React from "react";

interface Props {
  onSkip: () => void;
  isConnected: boolean;
}

const Header: React.FC<Props> = ({ onSkip, isConnected }) => (
  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <h1 className="text-white font-semibold text-lg">Anonymous Chat</h1>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
    </div>
    <button
      onClick={onSkip}
      className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full transition-colors"
    >
      Skip Chat ⏭️
    </button>
  </div>
);

export default Header;
