import React from "react";

const TestComponent: React.FC = () => {
  return (
    <div
      style={{
        width: "200px",
        height: "200px",
        backgroundColor: "lightblue",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <h1>This is a reusable Component</h1>
    </div>
  );
};

export default TestComponent;
