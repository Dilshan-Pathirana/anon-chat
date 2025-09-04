import React from "react";
import ChatWindow from "./components/chatWindow";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <ChatWindow />
    </div>
  );
};

export default App;
