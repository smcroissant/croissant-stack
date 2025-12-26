import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
    checked: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled1" disabled />
        <Label htmlFor="disabled1" className="text-muted-foreground">
          Disabled
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled2" disabled checked />
        <Label htmlFor="disabled2" className="text-muted-foreground">
          Disabled Checked
        </Label>
      </div>
    </div>
  ),
};

export const CheckboxGroup: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center space-x-2">
        <Checkbox id="option1" />
        <Label htmlFor="option1">Option 1</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option2" defaultChecked />
        <Label htmlFor="option2">Option 2 (default checked)</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option3" />
        <Label htmlFor="option3">Option 3</Label>
      </div>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="items-top flex space-x-2">
      <Checkbox id="terms1" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="terms1">Accept terms and conditions</Label>
        <p className="text-sm text-muted-foreground">
          You agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center space-x-2">
        <Checkbox id="invalid" aria-invalid="true" />
        <Label htmlFor="invalid">Accept terms and conditions</Label>
      </div>
      <p className="text-sm text-destructive">You must accept the terms to continue.</p>
    </div>
  ),
};

