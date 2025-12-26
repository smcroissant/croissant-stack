import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "@repo/ui/components/switch";
import { Label } from "@repo/ui/components/label";

const meta: Meta<typeof Switch> = {
  title: "Components/Switch",
  component: Switch,
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

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center space-x-2">
        <Switch disabled id="disabled-off" />
        <Label htmlFor="disabled-off" className="text-muted-foreground">
          Disabled Off
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch disabled checked id="disabled-on" />
        <Label htmlFor="disabled-on" className="text-muted-foreground">
          Disabled On
        </Label>
      </div>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="flex items-start space-x-4">
      <Switch id="marketing" />
      <div className="grid gap-1.5">
        <Label htmlFor="marketing">Marketing emails</Label>
        <p className="text-sm text-muted-foreground">
          Receive emails about new products, features, and more.
        </p>
      </div>
    </div>
  ),
};

export const SettingsList: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Push Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Receive push notifications on your device.
          </p>
        </div>
        <Switch />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Email Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Receive email updates about your account.
          </p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Dark Mode</Label>
          <p className="text-sm text-muted-foreground">
            Use dark theme across the application.
          </p>
        </div>
        <Switch />
      </div>
    </div>
  ),
};

export const FormIntegration: Story = {
  render: () => (
    <form className="w-[400px] space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium">Notification Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Security emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about your account security.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Marketing emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about new products and features.
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div>
    </form>
  ),
};

