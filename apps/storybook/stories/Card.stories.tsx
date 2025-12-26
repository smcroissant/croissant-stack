import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Badge } from "@repo/ui/components/badge";
import { MoreHorizontal, Bell, Settings } from "lucide-react";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content can include any elements.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Name of your project" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="framework">Framework</Label>
              <Input id="framework" placeholder="Next.js" />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Send push notifications to device.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This is a simple card with just a title and content.
        </p>
      </CardContent>
    </Card>
  ),
};

export const Stats: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card className="w-[180px]">
        <CardHeader className="pb-2">
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="text-3xl">$45,231</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">+20.1% from last month</p>
        </CardContent>
      </Card>
      <Card className="w-[180px]">
        <CardHeader className="pb-2">
          <CardDescription>Subscriptions</CardDescription>
          <CardTitle className="text-3xl">+2,350</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">+180.1% from last month</p>
        </CardContent>
      </Card>
      <Card className="w-[180px]">
        <CardHeader className="pb-2">
          <CardDescription>Active Users</CardDescription>
          <CardTitle className="text-3xl">+12,234</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">+19% from last month</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Project Status</CardTitle>
          <Badge>Active</Badge>
        </div>
        <CardDescription>Last updated 2 hours ago</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-sm">Progress</span>
            <span className="text-sm font-medium">75%</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-primary rounded-full" />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  ),
};

