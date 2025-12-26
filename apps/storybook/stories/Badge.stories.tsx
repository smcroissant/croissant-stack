import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@repo/ui/components/badge";
import { Check, X, AlertCircle, Info } from "lucide-react";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>
        <Check />
        Success
      </Badge>
      <Badge variant="destructive">
        <X />
        Error
      </Badge>
      <Badge variant="secondary">
        <AlertCircle />
        Warning
      </Badge>
      <Badge variant="outline">
        <Info />
        Info
      </Badge>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-green-500 text-white">Active</Badge>
      <Badge className="bg-yellow-500 text-black">Pending</Badge>
      <Badge className="bg-blue-500 text-white">In Progress</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="secondary">Archived</Badge>
    </div>
  ),
};

