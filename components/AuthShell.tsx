import { PeopleMapsLogo } from "./Logo";
import { IconMapMarker, IconPlus } from "./icons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page">
      <div className="flex h-full">
        <div className="flex w-full items-center justify-center px-4 md:w-1/2">
          <Card className="w-full max-w-[375px] shadow-lg">
            <CardHeader className="items-center pt-4 text-center">
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                {title}
              </h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-6 pb-6">
              {children}
            </CardContent>
          </Card>
        </div>
        <div className="hidden flex-col items-center justify-center gap-8 md:flex md:w-1/2">
          <PeopleMapsLogo size={130} />
          <div className="flex items-center justify-center gap-2">
            <IconMapMarker size={60} color="#2986ce" />
            <IconPlus size={60} color="#00b464" />
            <IconMapMarker size={60} color="#F94848" />
          </div>
          <img src="/pin-3.png" alt="PeopleMaps map pin" />
        </div>
      </div>
    </div>
  );
}