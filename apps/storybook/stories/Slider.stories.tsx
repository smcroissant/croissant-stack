import type { Meta, StoryObj } from "@storybook/react";
import { Slider } from "@repo/ui/components/slider";
import { useState } from "react";
import { Label } from "@repo/ui/components/label";

const meta: Meta<typeof Slider> = {
  title: "Components/Slider",
  component: Slider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
    min: {
      control: "number",
    },
    max: {
      control: "number",
    },
    step: {
      control: "number",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
    className: "w-[300px]",
  },
};

export const WithValue: Story = {
  render: function SliderWithValue() {
    const [value, setValue] = useState([50]);
    return (
      <div className="w-[300px] space-y-4">
        <div className="flex justify-between">
          <Label>Volume</Label>
          <span className="text-sm text-muted-foreground">{value[0]}%</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={1}
        />
      </div>
    );
  },
};

export const Range: Story = {
  render: function RangeSlider() {
    const [value, setValue] = useState([25, 75]);
    return (
      <div className="w-[300px] space-y-4">
        <div className="flex justify-between">
          <Label>Price Range</Label>
          <span className="text-sm text-muted-foreground">
            ${value[0]} - ${value[1]}
          </span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={1}
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    disabled: true,
    className: "w-[300px]",
  },
};

export const WithSteps: Story = {
  render: function SteppedSlider() {
    const [value, setValue] = useState([50]);
    return (
      <div className="w-[300px] space-y-4">
        <div className="flex justify-between">
          <Label>Step: 10</Label>
          <span className="text-sm text-muted-foreground">{value[0]}</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={10}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    );
  },
};

export const MinMax: Story = {
  render: function MinMaxSlider() {
    const [value, setValue] = useState([25]);
    return (
      <div className="w-[300px] space-y-4">
        <div className="flex justify-between">
          <Label>Temperature</Label>
          <span className="text-sm text-muted-foreground">{value[0]}°C</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          min={-20}
          max={40}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-20°C</span>
          <span>40°C</span>
        </div>
      </div>
    );
  },
};

export const Vertical: Story = {
  render: function VerticalSlider() {
    const [value, setValue] = useState([50]);
    return (
      <div className="flex items-center gap-4 h-[200px]">
        <Slider
          value={value}
          onValueChange={setValue}
          orientation="vertical"
          max={100}
          step={1}
        />
        <span className="text-sm text-muted-foreground">{value[0]}%</span>
      </div>
    );
  },
};

export const Multiple: Story = {
  render: () => (
    <div className="w-[300px] space-y-8">
      <div className="space-y-2">
        <Label>Brightness</Label>
        <Slider defaultValue={[80]} max={100} />
      </div>
      <div className="space-y-2">
        <Label>Contrast</Label>
        <Slider defaultValue={[50]} max={100} />
      </div>
      <div className="space-y-2">
        <Label>Saturation</Label>
        <Slider defaultValue={[65]} max={100} />
      </div>
    </div>
  ),
};

