import { usePassportPopupSetup } from "@pcd/passport-interface";
import React from "react";
import { createRoot } from "react-dom/client";

/**
 * This page is necessary to receive PCDs from the passport after requesting
 * a PCD from the passport. It uses the window messaging API to communicate
 * the PCD it received back to the requesting tab.
 */
export default function PassportPopupRedirect() {
  const error = usePassportPopupSetup();
  return <div>{error}</div>;
}

const container = document.getElementById("root");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(<PassportPopupRedirect />);
