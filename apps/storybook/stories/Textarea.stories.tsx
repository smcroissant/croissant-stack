import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "@repo/ui/components/textarea";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";

const meta: Meta<typeof Textarea> = {
  title: "Components/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
    placeholder: {
      control: "text",
    },
    rows: {
      control: "number",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Type your message here.",
    className: "w-[350px]",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-[350px] gap-1.5">
      <Label htmlFor="message">Your message</Label>
      <Textarea placeholder="Type your message here." id="message" />
    </div>
  ),
};

export const WithHelperText: Story = {
  render: () => (
    <div className="grid w-[350px] gap-1.5">
      <Label htmlFor="message-2">Your message</Label>
      <Textarea placeholder="Type your message here." id="message-2" />
      <p className="text-sm text-muted-foreground">
        Your message will be copied to the support team.
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "Disabled textarea",
    className: "w-[350px]",
  },
};

export const WithButton: Story = {
  render: () => (
    <div className="grid w-[350px] gap-2">
      <Textarea placeholder="Type your message here." />
      <Button>Send message</Button>
    </div>
  ),
};

export const WithCharacterCount: Story = {
  render: () => (
    <div className="grid w-[350px] gap-1.5">
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        placeholder="Tell us about yourself"
        maxLength={200}
        defaultValue="I'm a software developer passionate about creating great user experiences."
      />
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Write a short bio about yourself.
        </p>
        <p className="text-sm text-muted-foreground">72/200</p>
      </div>
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="grid w-[350px] gap-1.5">
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        placeholder="Enter description"
        aria-invalid="true"
      />
      <p className="text-sm text-destructive">Description is required.</p>
    </div>
  ),
};

export const CustomRows: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[350px]">
      <div className="grid gap-1.5">
        <Label>Small (2 rows)</Label>
        <Textarea placeholder="Small textarea" rows={2} />
      </div>
      <div className="grid gap-1.5">
        <Label>Medium (4 rows)</Label>
        <Textarea placeholder="Medium textarea" rows={4} />
      </div>
      <div className="grid gap-1.5">
        <Label>Large (6 rows)</Label>
        <Textarea placeholder="Large textarea" rows={6} />
      </div>
    </div>
  ),
};

