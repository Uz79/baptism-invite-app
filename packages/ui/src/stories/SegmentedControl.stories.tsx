import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SegmentedControl } from "../components/SegmentedControl";

function Demo() {
  const [value, setValue] = useState<"light" | "dark">("light");
  return (
    <SegmentedControl
      aria-label="Theme"
      block
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

const meta: Meta = { title: "Primitives/SegmentedControl", component: Demo };
export default meta;
type Story = StoryObj;
export const Theme: Story = {};
