import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/auth";
import { IS_RIDER } from "@/config";
import { ONBOARDED, prefs } from "@/storage";
import { Loading } from "@/ui";

/** Entry: riders must sign in; customers see the welcome slides once, then can browse and sign in at checkout. */
export default function Index() {
  const { ready, token } = useAuth();
  const [seen, setSeen] = useState<boolean | null>(IS_RIDER ? true : null);
  useEffect(() => {
    if (!IS_RIDER) prefs.get(ONBOARDED, false).then(setSeen);
  }, []);
  if (!ready || seen === null) return <Loading />;
  if (IS_RIDER) return <Redirect href={token ? "/rider" : "/login"} />;
  if (!seen && !token) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
