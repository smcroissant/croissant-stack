import type { Meta, StoryObj } from "@storybook/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/accordion";

const meta: Meta<typeof Accordion> = {
  title: "Components/Accordion",
  component: Accordion,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It adheres to the WAI-ARIA design pattern.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>
          Yes. It comes with default styles that matches the other components&apos;
          aesthetic.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>
          Yes. It&apos;s animated by default, but you can disable it if you prefer.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Can I open multiple items?</AccordionTrigger>
        <AccordionContent>
          Yes! This accordion allows multiple items to be open at once.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How does it work?</AccordionTrigger>
        <AccordionContent>
          Set the type prop to &quot;multiple&quot; to allow multiple items to be
          expanded simultaneously.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>What else can I customize?</AccordionTrigger>
        <AccordionContent>
          You can customize the default open items using the defaultValue prop.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <Accordion type="single" defaultValue="item-2" className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>First Item</AccordionTrigger>
        <AccordionContent>
          This item is closed by default.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Second Item (Default Open)</AccordionTrigger>
        <AccordionContent>
          This item is open by default because we set defaultValue=&quot;item-2&quot;.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Third Item</AccordionTrigger>
        <AccordionContent>
          This item is also closed by default.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const FAQ: Story = {
  render: () => (
    <div className="w-[500px]">
      <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
      <Accordion type="single" collapsible>
        <AccordionItem value="faq-1">
          <AccordionTrigger>What is your return policy?</AccordionTrigger>
          <AccordionContent>
            We offer a 30-day return policy for all unused items in their original
            packaging. Simply contact our support team to initiate a return.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="faq-2">
          <AccordionTrigger>How long does shipping take?</AccordionTrigger>
          <AccordionContent>
            Standard shipping takes 5-7 business days. Express shipping is available
            for 2-3 business day delivery. International shipping times vary by location.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="faq-3">
          <AccordionTrigger>Do you offer international shipping?</AccordionTrigger>
          <AccordionContent>
            Yes! We ship to over 100 countries worldwide. Shipping costs and delivery
            times vary depending on the destination.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="faq-4">
          <AccordionTrigger>How can I track my order?</AccordionTrigger>
          <AccordionContent>
            Once your order ships, you&apos;ll receive an email with a tracking number.
            You can use this number on our website or the carrier&apos;s website to track
            your package.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

