import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Label } from "@repo/ui/components/label";

const meta: Meta<typeof RadioGroup> = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" />
        <Label htmlFor="option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" />
        <Label htmlFor="option-two">Option Two</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="option-three" />
        <Label htmlFor="option-three">Option Three</Label>
      </div>
    </RadioGroup>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <RadioGroup defaultValue="comfortable" className="gap-4">
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="default" id="r1" className="mt-1" />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="r1">Default</Label>
          <p className="text-sm text-muted-foreground">
            The default system setting for notifications.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="comfortable" id="r2" className="mt-1" />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="r2">Comfortable</Label>
          <p className="text-sm text-muted-foreground">
            Receive notifications at a moderate frequency.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="compact" id="r3" className="mt-1" />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="r3">Compact</Label>
          <p className="text-sm text-muted-foreground">
            Minimal notifications for essential updates only.
          </p>
        </div>
      </div>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one" className="flex gap-4">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="h-option-one" />
        <Label htmlFor="h-option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="h-option-two" />
        <Label htmlFor="h-option-two">Option Two</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="h-option-three" />
        <Label htmlFor="h-option-three">Option Three</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="d-option-one" />
        <Label htmlFor="d-option-one">Available</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="d-option-two" disabled />
        <Label htmlFor="d-option-two" className="text-muted-foreground">
          Disabled
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="d-option-three" />
        <Label htmlFor="d-option-three">Available</Label>
      </div>
    </RadioGroup>
  ),
};

export const PlanSelection: Story = {
  render: () => (
    <RadioGroup defaultValue="pro" className="gap-4">
      <div className="flex items-center space-x-3 rounded-lg border p-4">
        <RadioGroupItem value="free" id="plan-free" />
        <div className="flex-1">
          <Label htmlFor="plan-free" className="font-medium">
            Free
          </Label>
          <p className="text-sm text-muted-foreground">Basic features for individuals</p>
        </div>
        <span className="text-sm font-medium">$0/mo</span>
      </div>
      <div className="flex items-center space-x-3 rounded-lg border border-primary p-4">
        <RadioGroupItem value="pro" id="plan-pro" />
        <div className="flex-1">
          <Label htmlFor="plan-pro" className="font-medium">
            Pro
          </Label>
          <p className="text-sm text-muted-foreground">Advanced features for professionals</p>
        </div>
        <span className="text-sm font-medium">$19/mo</span>
      </div>
      <div className="flex items-center space-x-3 rounded-lg border p-4">
        <RadioGroupItem value="enterprise" id="plan-enterprise" />
        <div className="flex-1">
          <Label htmlFor="plan-enterprise" className="font-medium">
            Enterprise
          </Label>
          <p className="text-sm text-muted-foreground">Custom solutions for teams</p>
        </div>
        <span className="text-sm font-medium">Contact us</span>
      </div>
    </RadioGroup>
  ),
};

