import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { StackParamsList } from "./index";
import PostsPage from "../../pages/PostsPage";
import RedditURL from "../../utils/RedditURL";

type HomeScreenProps = {
  StackNavigator: ReturnType<
    typeof createNativeStackNavigator<StackParamsList>
  >;
};

export default function HomeScreen({ StackNavigator }: HomeScreenProps) {
  return (
    <StackNavigator.Screen<"Home">
      name="Home"
      component={PostsPage}
      options={({ route }) => ({
        headerBackTitle: new RedditURL(route.params.url).getPageName(),
        title: "",
        headerTransparent: true,
        headerStyle: { backgroundColor: "transparent" },
        freezeOnBlur: true,
      })}
    />
  );
}
