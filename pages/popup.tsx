import { usePassportPopupSetup } from "@pcd/passport-interface";
import React from "react";

/**
 * This page is necessary to receive PCDs from the passport after requesting
 * a PCD from the passport. It uses the window messaging API to communicate
 * the PCD it received back to the requesting tab.
 */
export default function Home() {
  const error = usePassportPopupSetup();
  const foo = "fi";
  return (
    <>
      <div>{foo}</div>
    </>
  );
}
