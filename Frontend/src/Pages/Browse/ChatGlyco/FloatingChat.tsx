import React, { useState } from "react";
import ChatGlyco from "./ChatGlyco";

const FloatingChat: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);

  const toggleOpen = (): void => {
    setOpen((prev) => !prev);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {open && (
        <div className="w-80 h-96 shadow-lg rounded-lg flex flex-col bg-white">
          <ChatGlyco className="h-full w-full" />
        </div>
      )}

      <button
        onClick={toggleOpen}
        className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition mt-2"
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
};

export default FloatingChat;