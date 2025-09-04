import React from "react";

interface Props {
  context: string;
  instructions: string;
}

const Header: React.FC<Props> = ({ context, instructions }) => (
  <div className="bg-blue-100 px-4 py-2 border-b">
    <p className="text-sm font-semibold">{context}</p>
    <p className="text-xs text-gray-600">{instructions}</p>
  </div>
);

export default Header;
