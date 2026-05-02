import { Route, Switch } from "wouter";
import Index from "./pages/index";
import ToolPage from "./pages/tool";
import { Provider } from "./components/provider";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/tool/:id" component={ToolPage} />
      </Switch>    </Provider>
  );
}

export default App;
