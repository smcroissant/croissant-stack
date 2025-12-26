import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "@repo/ui/components/progress";
import { useEffect, useState } from "react";

const meta: Meta<typeof Progress> = {
  title: "Components/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
    className: "w-[300px]",
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    className: "w-[300px]",
  },
};

export const Full: Story = {
  args: {
    value: 100,
    className: "w-[300px]",
  },
};

export const Animated: Story = {
  render: function AnimatedProgress() {
    const [progress, setProgress] = useState(13);

    useEffect(() => {
      const timer = setTimeout(() => setProgress(66), 500);
      return () => clearTimeout(timer);
    }, []);

    return <Progress value={progress} className="w-[300px]" />;
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <div className="flex justify-between text-sm">
        <span>Progress</span>
        <span>75%</span>
      </div>
      <Progress value={75} />
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Upload</span>
          <span>25%</span>
        </div>
        <Progress value={25} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Processing</span>
          <span>50%</span>
        </div>
        <Progress value={50} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Complete</span>
          <span>100%</span>
        </div>
        <Progress value={100} />
      </div>
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <Progress value={60} className="[&>div]:bg-blue-500" />
      <Progress value={45} className="[&>div]:bg-green-500" />
      <Progress value={80} className="[&>div]:bg-yellow-500" />
      <Progress value={30} className="[&>div]:bg-red-500" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <Progress value={60} className="h-1" />
      <Progress value={60} className="h-2" />
      <Progress value={60} className="h-3" />
      <Progress value={60} className="h-4" />
    </div>
  ),
};

