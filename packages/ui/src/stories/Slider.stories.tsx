import type { Meta, StoryObj } from "@storybook/react";
import { Slider } from "../components/Slider";

const meta: Meta<typeof Slider> = {
  title: "Primitives/Slider",
  component: Slider,
  args: { min: 0, max: 100, defaultValue: 50 },
};
export default meta;
type Story = StoryObj<typeof Slider>;
export const Default: Story = {};
