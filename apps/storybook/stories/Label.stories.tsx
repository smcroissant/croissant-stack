import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "@repo/ui/components/label";
import { Input } from "@repo/ui/components/input";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Switch } from "@repo/ui/components/switch";
import { Badge } from "@repo/ui/components/badge";

const meta: Meta<typeof Label> = {
  title: "Components/Label",
  component: Label,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Label>Label</Label>,
};

export const WithInput: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const WithSwitch: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="name">
        Name <span className="text-destructive">*</span>
      </Label>
      <Input type="text" id="name" placeholder="Enter your name" required />
    </div>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="premium">
        Premium Feature
        <Badge variant="secondary" className="ml-2">
          Pro
        </Badge>
      </Label>
      <Input type="text" id="premium" placeholder="Premium input" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5 group" data-disabled="true">
      <Label htmlFor="disabled">Disabled Label</Label>
      <Input type="text" id="disabled" placeholder="Disabled input" disabled />
    </div>
  ),
};

export const Form: Story = {
  render: () => (
    <form className="w-[300px] space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="firstname">
          First Name <span className="text-destructive">*</span>
        </Label>
        <Input id="firstname" placeholder="John" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="lastname">
          Last Name <span className="text-destructive">*</span>
        </Label>
        <Input id="lastname" placeholder="Doe" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email-form">Email</Label>
        <Input id="email-form" type="email" placeholder="john@example.com" />
        <p className="text-xs text-muted-foreground">Optional</p>
      </div>
    </form>
  ),
};

