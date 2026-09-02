import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "../components/Chip";

const meta: Meta<typeof Chip> = {
  title: "Primitives/Chip",
  component: Chip,
  args: { children: "Robinson" },
};
export default meta;
type Story = StoryObj<typeof Chip>;
export const Default: Story = {};
export const Active: Story = { args: { active: true } };
