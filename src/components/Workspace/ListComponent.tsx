"use client";
import { useAuth } from "@clerk/nextjs";
import Pusher from "pusher-js";
import { ReactNode, useEffect, useState } from "react";
import { Replicache } from "replicache";
import { env } from "~/env.mjs";
import { wokrspaceMutators } from "~/repl/client/mutators/workspace";
import { Button } from "~/ui/Button";
import { WORKSPACE } from "~/utils/constants";
import { WorkspaceStore } from "~/zustand/workspace";
import List from "./List";
import { ArrowBigRightDash } from "lucide-react";
export default function ListComponent({ children }: { children: ReactNode }) {
  const [showList, toggleShowList] = useState(true);
  const rep = WorkspaceStore((state) => state.rep);
  const setRep = WorkspaceStore((state) => state.setRep);

  const toggle = () => {
    toggleShowList((val) => !val);
    localStorage.setItem("workspaceList", JSON.stringify(!showList));
  };
  useEffect(() => {
    const showList = JSON.parse(
      localStorage.getItem("workspaceList") as string
    ) as boolean;
    if (showList) {
      toggleShowList(showList);
    }
  }, []);

  const { userId } = useAuth();

  useEffect(() => {
    if (rep) {
      return;
    }
    if (userId) {
      const r = new Replicache({
        name: `${WORKSPACE}#${userId}`,
        licenseKey: env.NEXT_PUBLIC_REPLICACHE_KEY,
        pushURL: `/api/replicache-push?spaceId=${WORKSPACE}`,
        pullURL: `/api/replicache-pull?spaceId=${WORKSPACE}`,
        mutators: wokrspaceMutators,
        pullInterval: null,
      });
      setRep(r);
      if (env.NEXT_PUBLIC_PUSHER_KEY && env.NEXT_PUBLIC_PUSHER_CLUSTER) {
        Pusher.logToConsole = true;
        const pusher = new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
          cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
        });

        const channel = pusher.subscribe(WORKSPACE);
        channel.bind("poke", (data: string) => {
          if (data && data !== userId) {
            r.pull();
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep, userId]);
  if (!userId) {
    return;
  }
  return (
    <>
      <List
        showList={showList}
        toggleShowList={toggle}
        rep={rep}
        userId={userId}
      />
      <div className={`workspaceContainer ${showList ? "adjust" : ""}`}>
        {!showList ? (
          <Button
            className="absolute z-30 m-2 bg-blue-4 hover:bg-blue-5"
            aria-label="open list"
            size="icon"
            onClick={() => toggle()}
          >
            <ArrowBigRightDash className="text-blue-9" />
          </Button>
        ) : null}
        {children}
      </div>
    </>
  );
}
