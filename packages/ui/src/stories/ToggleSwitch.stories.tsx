import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ToggleSwitch } from "../components/ToggleSwitch";

function Demo() {
  const [on, setOn] = useState(true);
  return <ToggleSwitch checked={on} onCheckedChange={setOn} aria-label="Demo toggle" />;
}

const meta: Meta = { title: "Primitives/ToggleSwitch", component: Demo };
export default meta;
type Story = StoryObj;
export const Default: Story = {};
