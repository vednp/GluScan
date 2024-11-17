import React from "react";

function InputField({ name, value, unit }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <div className="">{name}: </div>
      <input
        type="text"
        className="text-center p-2 rounded w-20 text-lg"
        value={value}
      />
      <div className="">{unit}</div>
    </div>
  );
}

export default InputField;
