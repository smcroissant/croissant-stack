import type { Meta, StoryObj } from "@storybook/react";
import { ScrollArea, ScrollBar } from "@repo/ui/components/scroll-area";
import { Separator } from "@repo/ui/components/separator";

const meta: Meta<typeof ScrollArea> = {
  title: "Components/ScrollArea",
  component: ScrollArea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

const tags = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`);

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

const works = [
  {
    artist: "Ornella Binni",
    art: "https://images.unsplash.com/photo-1465869185982-5a1a7522f2ab?w=300&h=200&fit=crop",
  },
  {
    artist: "Tom Byrom",
    art: "https://images.unsplash.com/photo-1548516173-3cabfa4607e9?w=300&h=200&fit=crop",
  },
  {
    artist: "Vladimir Malyutin",
    art: "https://images.unsplash.com/photo-1494337480532-3725c85fd2ab?w=300&h=200&fit=crop",
  },
  {
    artist: "Vladimir Malyutin",
    art: "https://images.unsplash.com/photo-1518756131217-31eb79b20e8f?w=300&h=200&fit=crop",
  },
];

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {works.map((work) => (
          <figure key={work.artist} className="shrink-0">
            <div className="overflow-hidden rounded-md">
              <img
                src={work.art}
                alt={`Photo by ${work.artist}`}
                className="aspect-[3/2] h-32 w-48 object-cover"
              />
            </div>
            <figcaption className="pt-2 text-xs text-muted-foreground">
              Photo by{" "}
              <span className="font-semibold text-foreground">{work.artist}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

export const WithMessages: Story = {
  render: () => {
    const messages = [
      { id: 1, sender: "John", message: "Hey, how are you?" },
      { id: 2, sender: "You", message: "I'm good, thanks! How about you?" },
      { id: 3, sender: "John", message: "Doing great! Did you see the game last night?" },
      { id: 4, sender: "You", message: "Yes! It was amazing!" },
      { id: 5, sender: "John", message: "That last-minute goal was incredible." },
      { id: 6, sender: "You", message: "I couldn't believe it!" },
      { id: 7, sender: "John", message: "We should watch the next one together." },
      { id: 8, sender: "You", message: "Sounds like a plan!" },
      { id: 9, sender: "John", message: "I'll bring the snacks." },
      { id: 10, sender: "You", message: "Perfect, I'll handle the drinks." },
    ];

    return (
      <ScrollArea className="h-72 w-80 rounded-md border p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-lg px-3 py-2 max-w-[70%] ${
                  msg.sender === "You"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  },
};

export const LongContent: Story = {
  render: () => (
    <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
      <div className="pr-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Lorem Ipsum</h4>
        <p className="text-sm text-muted-foreground">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
          veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
          proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab
          illo inventore veritatis et quasi architecto beatae vitae dicta sunt
          explicabo.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
          fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem
          sequi nesciunt.
        </p>
      </div>
    </ScrollArea>
  ),
};

