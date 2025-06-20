import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { logger } from '../utils/logger.js';
import { formatBytes, formatUptime } from '../utils/formatters.js';

export const statusCommand = new Command('status')
  .description('Show platform or service status')
  .argument('[service]', 'Service name (optional)')
  .option('--json', 'Output as JSON')
  .option('-w, --watch', 'Watch status (refresh every 5s)')
  .action(async (serviceName, options) => {
    try {
      if (serviceName) {
        // Show specific service status
        await showServiceStatus(serviceName, options);
      } else {
        // Show platform status
        await showPlatformStatus(options);
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      logger.error('Status command failed', error);
      process.exit(1);
    }
  });

async function showServiceStatus(serviceName: string, options: any) {
  const fetchStatus = async () => {
    const spinner = ora('Fetching service status...').start();
    
    try {
      const status = await api.getServiceStatus(serviceName);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      console.clear();
      console.log(chalk.bold.blue(`Service Status: ${serviceName}\n`));

      // Health Status
      const healthIcon = 
        status.health === 'healthy' ? chalk.green('✓') :
        status.health === 'warning' ? chalk.yellow('⚠') :
        chalk.red('✗');
      const healthColor = 
        status.health === 'healthy' ? chalk.green :
        status.health === 'warning' ? chalk.yellow :
        chalk.red;

      console.log(chalk.bold('Health:') + '       ' + healthIcon + ' ' + healthColor(status.health.toUpperCase()));
      console.log(chalk.bold('Version:') + '      ' + status.version);
      console.log(chalk.bold('Environment:') + '  ' + status.environment);
      console.log(chalk.bold('Uptime:') + '       ' + formatUptime(status.uptime));
      console.log(chalk.bold('Last Deploy:') + '  ' + new Date(status.lastDeploy).toLocaleString());

      // Instances
      console.log('\n' + chalk.bold('Instances:'));
      console.log(`  Running: ${chalk.green(status.instances.running)}/${status.instances.desired}`);
      console.log(`  Pending: ${status.instances.pending}`);
      console.log(`  Failed:  ${status.instances.failed > 0 ? chalk.red(status.instances.failed) : status.instances.failed}`);

      // Resources
      console.log('\n' + chalk.bold('Resources:'));
      const cpuColor = status.resources.cpu > 80 ? chalk.red : status.resources.cpu > 60 ? chalk.yellow : chalk.green;
      const memColor = status.resources.memory > 80 ? chalk.red : status.resources.memory > 60 ? chalk.yellow : chalk.green;
      
      console.log(`  CPU:    ${cpuColor(status.resources.cpu + '%')} (${status.resources.cpuCores} cores)`);
      console.log(`  Memory: ${memColor(status.resources.memory + '%')} (${formatBytes(status.resources.memoryBytes)})`);
      console.log(`  Disk:   ${status.resources.disk}% (${formatBytes(status.resources.diskBytes)})`);

      // Metrics
      console.log('\n' + chalk.bold('Metrics (last 5 min):'));
      console.log(`  Requests:     ${status.metrics.requests}/min`);
      console.log(`  Errors:       ${status.metrics.errors} (${status.metrics.errorRate}%)`);
      console.log(`  Avg Latency:  ${status.metrics.avgLatency}ms`);
      console.log(`  P99 Latency:  ${status.metrics.p99Latency}ms`);

      // Recent Events
      if (status.events && status.events.length > 0) {
        console.log('\n' + chalk.bold('Recent Events:'));
        status.events.slice(0, 5).forEach((event: any) => {
          const eventIcon = 
            event.type === 'error' ? chalk.red('•') :
            event.type === 'warning' ? chalk.yellow('•') :
            chalk.blue('•');
          console.log(`  ${eventIcon} ${chalk.gray(new Date(event.timestamp).toLocaleTimeString())} ${event.message}`);
        });
      }

      if (options.watch) {
        console.log(chalk.gray('\n\nRefreshing every 5 seconds. Press Ctrl+C to exit.'));
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch service status'));
      throw error;
    }
  };

  if (options.watch) {
    await fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log(chalk.gray('\nExiting...'));
      process.exit(0);
    });
  } else {
    await fetchStatus();
  }
}

async function showPlatformStatus(options: any) {
  const spinner = ora('Fetching platform status...').start();
  
  try {
    const status = await api.getPlatformStatus();
    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    console.log(chalk.bold.blue('DevX Platform Status\n'));

    // Overall Health
    const overallHealthIcon = 
      status.health === 'operational' ? chalk.green('✓') :
      status.health === 'degraded' ? chalk.yellow('⚠') :
      chalk.red('✗');
    const overallHealthColor = 
      status.health === 'operational' ? chalk.green :
      status.health === 'degraded' ? chalk.yellow :
      chalk.red;

    console.log(chalk.bold('System Status:') + ' ' + overallHealthIcon + ' ' + overallHealthColor(status.health.toUpperCase()));
    console.log(chalk.bold('Version:') + '       ' + status.version);
    console.log(chalk.bold('Region:') + '        ' + status.region);
    console.log(chalk.bold('Uptime:') + '        ' + formatUptime(status.uptime));

    // Service Summary
    console.log('\n' + chalk.bold('Services:'));
    console.log(`  Total:    ${status.services.total}`);
    console.log(`  Healthy:  ${chalk.green(status.services.healthy)}`);
    console.log(`  Warning:  ${chalk.yellow(status.services.warning)}`);
    console.log(`  Error:    ${chalk.red(status.services.error)}`);

    // Resource Usage
    console.log('\n' + chalk.bold('Platform Resources:'));
    console.log(`  CPU Usage:       ${status.resources.cpuPercent}%`);
    console.log(`  Memory Usage:    ${status.resources.memoryPercent}% (${formatBytes(status.resources.memoryUsed)}/${formatBytes(status.resources.memoryTotal)})`);
    console.log(`  Active Users:    ${status.resources.activeUsers}`);
    console.log(`  API Requests:    ${status.resources.apiRequests}/min`);

    // Component Status
    console.log('\n' + chalk.bold('Components:'));
    Object.entries(status.components).forEach(([component, componentStatus]: [string, any]) => {
      const icon = 
        componentStatus.status === 'operational' ? chalk.green('✓') :
        componentStatus.status === 'degraded' ? chalk.yellow('⚠') :
        chalk.red('✗');
      console.log(`  ${component.padEnd(20)} ${icon} ${componentStatus.status}`);
    });

    // Recent Incidents
    if (status.incidents && status.incidents.length > 0) {
      console.log('\n' + chalk.bold('Recent Incidents:'));
      status.incidents.slice(0, 3).forEach((incident: any) => {
        const severity = 
          incident.severity === 'critical' ? chalk.red :
          incident.severity === 'major' ? chalk.yellow :
          chalk.blue;
        console.log(`  ${severity('•')} ${chalk.gray(new Date(incident.timestamp).toLocaleDateString())} ${incident.title}`);
      });
    }

    logger.info('Viewed platform status');
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to fetch platform status'));
    throw error;
  }
}