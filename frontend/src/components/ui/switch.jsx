// components/ui/switch.jsx
import React from "react";
import "./ui.css";

const Switch = ({ checked, onChange, id = "react-switch-default" }) => {
  return (
    <>
      <input
        className="react-switch-checkbox"
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <label className="react-switch-label" htmlFor={id}>
        <span className={`react-switch-button`} />
      </label>
    </>
  );
};

export { Switch };
