import React from "react";

const TestComponent2: React.FC = () => {
  return (
    <div
      style={{
        width: "200px",
        height: "200px",
        backgroundColor: "lightgreen",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <h1>This is also a reusable Component</h1>
      <p>my reusable component in staging!!</p>
    </div>
  );
};

export default TestComponent2;
