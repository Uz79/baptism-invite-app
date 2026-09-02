import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../components/Button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Label", variant: "primary", size: "sm" },
};
export default meta;
type Story = StoryObj<typeof Button>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Tonal: Story = { args: { variant: "tonal" } };
