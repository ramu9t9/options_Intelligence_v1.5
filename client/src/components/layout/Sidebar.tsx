import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Settings, 
  PieChart, 
  Activity, 
  Zap, 
  Shield, 
  User,
  Database,
  Home,
  Target,
  Brain,
  ChevronDown,
  ChevronRight,
  Bot,
  LineChart,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

function SidebarItem({ href, icon: Icon, label, badge, isActive, isCollapsed }: SidebarItemProps) {
  return (
    <Link
      to={href}
      className={cn(
        "sidebar-item group",
        isActive && "active",
        isCollapsed && "justify-center px-2"
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function SidebarSection({ title, children, isCollapsed, isExpanded = true, onToggle }: SidebarSectionProps) {
  if (isCollapsed) {
    return <div className="py-2">{children}</div>;
  }

  return (
    <div className="py-2">
      <button
        onClick={onToggle}
        className="flex items-center w-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        {onToggle && (
          <div className="mr-1">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </div>
        )}
        <span className="uppercase tracking-wide">{title}</span>
      </button>
      {isExpanded && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = React.useState({
    trading: true,
    analysis: true,
    management: true,
    system: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActivePath = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    return path !== '/' && location.pathname.startsWith(path);
  };

  return (
    <div className={cn(
      "h-full bg-sidebar border-r border-sidebar-border flex flex-col sidebar-container",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center px-4 py-6 border-b border-sidebar-border",
        isCollapsed && "px-3 justify-center"
      )}>
        {!isCollapsed ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">Options Intelligence</h1>
              <p className="text-xs text-sidebar-foreground/60">Professional Platform</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {/* Trading Section */}
        <SidebarSection 
          title="Trading" 
          isCollapsed={isCollapsed}
          isExpanded={expandedSections.trading}
          onToggle={() => toggleSection('trading')}
        >
          <SidebarItem
            href="/"
            icon={Home}
            label="Dashboard"
            isActive={isActivePath('/')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/option-chain"
            icon={BarChart3}
            label="Option Chain"
            badge="Live"
            isActive={isActivePath('/option-chain')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/multi-segment"
            icon={PieChart}
            label="Multi-Segment"
            isActive={isActivePath('/multi-segment')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/commodity-analytics"
            icon={Activity}
            label="Commodities"
            isActive={isActivePath('/commodity-analytics')}
            isCollapsed={isCollapsed}
          />
        </SidebarSection>

        {/* Analysis Section */}
        <SidebarSection 
          title="Analysis" 
          isCollapsed={isCollapsed}
          isExpanded={expandedSections.analysis}
          onToggle={() => toggleSection('analysis')}
        >
          <SidebarItem
            href="/pattern-analysis"
            icon={Target}
            label="Pattern Detection"
            badge="AI"
            isActive={isActivePath('/pattern-analysis')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/strategy-builder"
            icon={Brain}
            label="Strategy Builder"
            isActive={isActivePath('/strategy-builder')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/backtesting"
            icon={Zap}
            label="Backtesting"
            badge="Pro"
            isActive={isActivePath('/backtesting')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/ai-assistant"
            icon={Bot}
            label="AI Assistant"
            badge="GPT"
            isActive={isActivePath('/ai-assistant')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/backtest-results"
            icon={LineChart}
            label="Backtest Results"
            isActive={isActivePath('/backtest-results')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/market-reports"
            icon={FileText}
            label="Market Reports"
            isActive={isActivePath('/market-reports')}
            isCollapsed={isCollapsed}
          />
        </SidebarSection>

        {/* Management Section */}
        <SidebarSection 
          title="Management" 
          isCollapsed={isCollapsed}
          isExpanded={expandedSections.management}
          onToggle={() => toggleSection('management')}
        >
          <SidebarItem
            href="/broker-setup"
            icon={Database}
            label="Broker Setup"
            isActive={isActivePath('/broker-setup')}
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            href="/settings"
            icon={Settings}
            label="Settings"
            isActive={isActivePath('/settings')}
            isCollapsed={isCollapsed}
          />
        </SidebarSection>

        {/* System Section */}
        <SidebarSection 
          title="System" 
          isCollapsed={isCollapsed}
          isExpanded={expandedSections.system}
          onToggle={() => toggleSection('system')}
        >
          <SidebarItem
            href="/admin"
            icon={Shield}
            label="Admin Panel"
            badge="Admin"
            isActive={isActivePath('/admin')}
            isCollapsed={isCollapsed}
          />
        </SidebarSection>
      </div>

      {/* Footer */}
      <div className={cn(
        "border-t border-sidebar-border p-4",
        isCollapsed && "p-3"
      )}>
        {!isCollapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                Trading User
              </p>
              <p className="text-xs text-sidebar-foreground/60">Free Plan</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}