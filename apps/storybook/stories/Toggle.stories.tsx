import type { Meta, StoryObj } from "@storybook/react";
import { Toggle } from "@repo/ui/components/toggle";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

const meta: Meta<typeof Toggle> = {
  title: "Components/Toggle",
  component: Toggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg"],
    },
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Toggle aria-label="Toggle italic">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
};

export const Outline: Story = {
  render: () => (
    <Toggle variant="outline" aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
    </Toggle>
  ),
};

export const WithText: Story = {
  render: () => (
    <Toggle aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
      Italic
    </Toggle>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle size="sm" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="default" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="lg" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Toggle disabled aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
    </Toggle>
  ),
};

export const TextFormatting: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Toggle aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Toggle underline">
        <Underline className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};

export const TextAlignment: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Toggle variant="outline" aria-label="Align left" defaultPressed>
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle variant="outline" aria-label="Align center">
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle variant="outline" aria-label="Align right">
        <AlignRight className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};

export const Pressed: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle aria-label="Toggle bold" defaultPressed>
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle variant="outline" aria-label="Toggle italic" defaultPressed>
        <Italic className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};

