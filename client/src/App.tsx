import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import RealmLayout from "@/components/RealmLayout";
import Dashboard from "@/pages/dashboard";
import Archive from "@/pages/archive";
import Trends from "@/pages/trends";
import BriefingDetail from "@/pages/BriefingDetail";
import Confirm from "@/pages/Confirm";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <Router hook={useHashLocation}>
            <RealmLayout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/archive" component={Archive} />
                <Route path="/trends" component={Trends} />
                <Route path="/briefing/:id" component={BriefingDetail} />
                <Route path="/confirm" component={Confirm} />
                <Route path="/admin" component={Admin} />
                <Route component={NotFound} />
              </Switch>
            </RealmLayout>
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
