import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "@repo/ui/components/separator";

const meta: Meta<typeof Separator> = {
  title: "Components/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    decorative: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[300px]">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Radix Primitives</h4>
        <p className="text-sm text-muted-foreground">
          An open-source UI component library.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <p className="text-sm">Content above separator</p>
      <Separator />
      <p className="text-sm">Content below separator</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center space-x-4 text-sm">
      <div>Item 1</div>
      <Separator orientation="vertical" />
      <div>Item 2</div>
      <Separator orientation="vertical" />
      <div>Item 3</div>
    </div>
  ),
};

export const InCard: Story = {
  render: () => (
    <div className="w-[300px] rounded-lg border p-4">
      <h3 className="font-semibold">Settings</h3>
      <p className="text-sm text-muted-foreground">
        Manage your account settings.
      </p>
      <Separator className="my-4" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Email notifications</span>
          <span className="text-sm text-muted-foreground">On</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm">Push notifications</span>
          <span className="text-sm text-muted-foreground">Off</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm">SMS notifications</span>
          <span className="text-sm text-muted-foreground">On</span>
        </div>
      </div>
    </div>
  ),
};

export const Navigation: Story = {
  render: () => (
    <div className="flex items-center space-x-2 text-sm">
      <a href="#" className="text-primary hover:underline">
        Home
      </a>
      <Separator orientation="vertical" className="h-4" />
      <a href="#" className="text-primary hover:underline">
        Products
      </a>
      <Separator orientation="vertical" className="h-4" />
      <a href="#" className="text-primary hover:underline">
        About
      </a>
      <Separator orientation="vertical" className="h-4" />
      <a href="#" className="text-primary hover:underline">
        Contact
      </a>
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="w-[300px]">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
    </div>
  ),
};

