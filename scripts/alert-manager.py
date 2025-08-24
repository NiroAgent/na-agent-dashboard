#!/usr/bin/env python3
"""
Advanced Alert Manager for Production Agent System
Handles multiple alert channels, escalation, and intelligent filtering
"""

import json
import time
import smtplib
import requests
import boto3
from email.mime.text import MIMEText as MimeText
from email.mime.multipart import MIMEMultipart as MimeMultipart
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class AlertChannel(Enum):
    EMAIL = "email"
    SLACK = "slack" 
    SNS = "sns"
    WEBHOOK = "webhook"
    PAGERDUTY = "pagerduty"

@dataclass
class Alert:
    level: AlertLevel
    title: str
    message: str
    component: str
    timestamp: datetime
    metadata: Dict[str, Any]
    alert_id: str
    resolved: bool = False
    acknowledged: bool = False
    escalated: bool = False

@dataclass
class AlertRule:
    name: str
    condition: str
    threshold: float
    duration: int  # seconds
    level: AlertLevel
    channels: List[AlertChannel]
    cooldown: int = 300  # 5 minutes default
    enabled: bool = True

@dataclass
class NotificationChannel:
    channel_type: AlertChannel
    config: Dict[str, Any]
    enabled: bool = True

class AlertManager:
    def __init__(self, config_file: str = None):
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.rules: List[AlertRule] = []
        self.channels: Dict[AlertChannel, NotificationChannel] = {}
        self.last_notification: Dict[str, datetime] = {}
        
        # Load configuration
        if config_file:
            self.load_config(config_file)
        else:
            self.setup_default_config()
    
    def setup_default_config(self):
        """Setup default alert rules and channels"""
        
        # Default alert rules
        self.rules = [
            AlertRule(
                name="high_response_time",
                condition="response_time_ms > threshold",
                threshold=5000,
                duration=60,
                level=AlertLevel.WARNING,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK]
            ),
            AlertRule(
                name="agent_down",
                condition="active_agents < threshold",
                threshold=3,
                duration=30,
                level=AlertLevel.CRITICAL,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.SNS]
            ),
            AlertRule(
                name="high_cpu",
                condition="cpu_percent > threshold",
                threshold=80,
                duration=300,  # 5 minutes
                level=AlertLevel.WARNING,
                channels=[AlertChannel.EMAIL]
            ),
            AlertRule(
                name="high_memory",
                condition="memory_percent > threshold", 
                threshold=85,
                duration=300,
                level=AlertLevel.WARNING,
                channels=[AlertChannel.EMAIL]
            ),
            AlertRule(
                name="system_critical",
                condition="overall_health == 'critical'",
                threshold=1,
                duration=0,
                level=AlertLevel.EMERGENCY,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.SNS, AlertChannel.PAGERDUTY]
            ),
            AlertRule(
                name="deprecated_service_running",
                condition="deprecated_services_detected > threshold",
                threshold=0,
                duration=0,
                level=AlertLevel.WARNING,
                channels=[AlertChannel.EMAIL]
            )
        ]
        
        # Default notification channels (will need to be configured)
        self.channels = {
            AlertChannel.EMAIL: NotificationChannel(
                channel_type=AlertChannel.EMAIL,
                config={
                    "smtp_server": "smtp.gmail.com",
                    "smtp_port": 587,
                    "username": "",  # Configure with actual email
                    "password": "",  # Configure with app password
                    "from_email": "",
                    "to_emails": []  # List of recipient emails
                },
                enabled=False  # Disabled until configured
            ),
            AlertChannel.SLACK: NotificationChannel(
                channel_type=AlertChannel.SLACK,
                config={
                    "webhook_url": "",  # Slack webhook URL
                    "channel": "#alerts",
                    "username": "Agent Monitor"
                },
                enabled=False
            ),
            AlertChannel.SNS: NotificationChannel(
                channel_type=AlertChannel.SNS,
                config={
                    "topic_arn": "",  # SNS topic ARN
                    "region": "us-east-1"
                },
                enabled=False
            ),
            AlertChannel.WEBHOOK: NotificationChannel(
                channel_type=AlertChannel.WEBHOOK,
                config={
                    "url": "",  # Webhook URL
                    "method": "POST",
                    "headers": {"Content-Type": "application/json"}
                },
                enabled=False
            ),
            AlertChannel.PAGERDUTY: NotificationChannel(
                channel_type=AlertChannel.PAGERDUTY,
                config={
                    "integration_key": "",  # PagerDuty integration key
                    "service_url": "https://events.pagerduty.com/v2/enqueue"
                },
                enabled=False
            )
        }
    
    def load_config(self, config_file: str):
        """Load configuration from JSON file"""
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            # Load rules
            self.rules = []
            for rule_data in config.get('rules', []):
                rule = AlertRule(
                    name=rule_data['name'],
                    condition=rule_data['condition'],
                    threshold=rule_data['threshold'],
                    duration=rule_data['duration'],
                    level=AlertLevel(rule_data['level']),
                    channels=[AlertChannel(ch) for ch in rule_data['channels']],
                    cooldown=rule_data.get('cooldown', 300),
                    enabled=rule_data.get('enabled', True)
                )
                self.rules.append(rule)
            
            # Load channels
            self.channels = {}
            for ch_name, ch_data in config.get('channels', {}).items():
                channel = NotificationChannel(
                    channel_type=AlertChannel(ch_name),
                    config=ch_data['config'],
                    enabled=ch_data.get('enabled', True)
                )
                self.channels[AlertChannel(ch_name)] = channel
                
            logger.info(f"Loaded configuration from {config_file}")
            
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            self.setup_default_config()
    
    def save_config(self, config_file: str):
        """Save current configuration to JSON file"""
        config = {
            'rules': [
                {
                    'name': rule.name,
                    'condition': rule.condition,
                    'threshold': rule.threshold,
                    'duration': rule.duration,
                    'level': rule.level.value,
                    'channels': [ch.value for ch in rule.channels],
                    'cooldown': rule.cooldown,
                    'enabled': rule.enabled
                }
                for rule in self.rules
            ],
            'channels': {
                ch_type.value: {
                    'config': channel.config,
                    'enabled': channel.enabled
                }
                for ch_type, channel in self.channels.items()
            }
        }
        
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"Configuration saved to {config_file}")
    
    def evaluate_rules(self, metrics: Dict[str, Any]) -> List[Alert]:
        """Evaluate alert rules against current metrics"""
        triggered_alerts = []
        
        for rule in self.rules:
            if not rule.enabled:
                continue
            
            try:
                # Simple condition evaluation
                condition_met = self._evaluate_condition(rule, metrics)
                
                if condition_met:
                    alert_id = f"{rule.name}_{int(time.time())}"
                    
                    # Check cooldown
                    last_alert_key = f"{rule.name}"
                    if (last_alert_key in self.last_notification and 
                        datetime.now() - self.last_notification[last_alert_key] < timedelta(seconds=rule.cooldown)):
                        continue
                    
                    alert = Alert(
                        level=rule.level,
                        title=f"Alert: {rule.name.replace('_', ' ').title()}",
                        message=self._generate_alert_message(rule, metrics),
                        component=rule.name,
                        timestamp=datetime.now(),
                        metadata=metrics,
                        alert_id=alert_id
                    )
                    
                    triggered_alerts.append(alert)
                    self.active_alerts[alert_id] = alert
                    self.last_notification[last_alert_key] = datetime.now()
                    
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.name}: {e}")
        
        return triggered_alerts
    
    def _evaluate_condition(self, rule: AlertRule, metrics: Dict[str, Any]) -> bool:
        """Evaluate if rule condition is met"""
        condition = rule.condition
        threshold = rule.threshold
        
        # Simple condition evaluation - can be extended
        if "response_time_ms" in condition:
            value = metrics.get('discovery_server', {}).get('response_time_ms', 0)
            return value > threshold
        
        elif "active_agents" in condition:
            value = metrics.get('daemon_agents', {}).get('active_daemon_agents', 0)
            return value < threshold
        
        elif "cpu_percent" in condition:
            value = metrics.get('system_resources', {}).get('cpu_percent', 0)
            return value > threshold
        
        elif "memory_percent" in condition:
            value = metrics.get('system_resources', {}).get('memory_percent', 0)
            return value > threshold
        
        elif "overall_health == 'critical'" in condition:
            value = metrics.get('overall_health', {}).get('status', 'unknown')
            return value == 'critical'
        
        elif "deprecated_services_detected" in condition:
            value = len(metrics.get('deprecated_services', {}).get('running_deprecated_services', []))
            return value > threshold
        
        return False
    
    def _generate_alert_message(self, rule: AlertRule, metrics: Dict[str, Any]) -> str:
        """Generate human-readable alert message"""
        messages = {
            'high_response_time': f"API response time is {metrics.get('discovery_server', {}).get('response_time_ms', 0):.1f}ms (threshold: {rule.threshold}ms)",
            'agent_down': f"Only {metrics.get('daemon_agents', {}).get('active_daemon_agents', 0)} agents active (minimum: {rule.threshold})",
            'high_cpu': f"CPU usage is {metrics.get('system_resources', {}).get('cpu_percent', 0):.1f}% (threshold: {rule.threshold}%)",
            'high_memory': f"Memory usage is {metrics.get('system_resources', {}).get('memory_percent', 0):.1f}% (threshold: {rule.threshold}%)",
            'system_critical': f"System health is critical - immediate attention required",
            'deprecated_service_running': f"Deprecated services detected: {metrics.get('deprecated_services', {}).get('running_deprecated_services', [])}"
        }
        
        return messages.get(rule.name, f"Alert condition met for {rule.name}")
    
    def send_alert(self, alert: Alert, channels: List[AlertChannel]):
        """Send alert through specified channels"""
        for channel_type in channels:
            if channel_type not in self.channels:
                continue
                
            channel = self.channels[channel_type]
            if not channel.enabled:
                continue
            
            try:
                if channel_type == AlertChannel.EMAIL:
                    self._send_email_alert(alert, channel)
                elif channel_type == AlertChannel.SLACK:
                    self._send_slack_alert(alert, channel)
                elif channel_type == AlertChannel.SNS:
                    self._send_sns_alert(alert, channel)
                elif channel_type == AlertChannel.WEBHOOK:
                    self._send_webhook_alert(alert, channel)
                elif channel_type == AlertChannel.PAGERDUTY:
                    self._send_pagerduty_alert(alert, channel)
                
                logger.info(f"Alert sent via {channel_type.value}: {alert.title}")
                
            except Exception as e:
                logger.error(f"Failed to send alert via {channel_type.value}: {e}")
    
    def _send_email_alert(self, alert: Alert, channel: NotificationChannel):
        """Send email alert"""
        config = channel.config
        
        if not config.get('username') or not config.get('to_emails'):
            logger.warning("Email channel not properly configured")
            return
        
        msg = MimeMultipart()
        msg['From'] = config['from_email']
        msg['To'] = ', '.join(config['to_emails'])
        msg['Subject'] = f"[{alert.level.value.upper()}] {alert.title}"
        
        body = f"""
        Alert Level: {alert.level.value.upper()}
        Component: {alert.component}
        Time: {alert.timestamp}
        
        Message:
        {alert.message}
        
        Metadata:
        {json.dumps(alert.metadata, indent=2)}
        
        --
        NiroAgent Production Monitoring System
        """
        
        msg.attach(MimeText(body, 'plain'))
        
        with smtplib.SMTP(config['smtp_server'], config['smtp_port']) as server:
            server.starttls()
            server.login(config['username'], config['password'])
            server.send_message(msg)
    
    def _send_slack_alert(self, alert: Alert, channel: NotificationChannel):
        """Send Slack alert"""
        config = channel.config
        
        if not config.get('webhook_url'):
            logger.warning("Slack channel not properly configured")
            return
        
        color_map = {
            AlertLevel.INFO: "good",
            AlertLevel.WARNING: "warning", 
            AlertLevel.CRITICAL: "danger",
            AlertLevel.EMERGENCY: "#FF0000"
        }
        
        payload = {
            "channel": config.get('channel', '#alerts'),
            "username": config.get('username', 'Agent Monitor'),
            "attachments": [
                {
                    "color": color_map.get(alert.level, "warning"),
                    "title": alert.title,
                    "text": alert.message,
                    "fields": [
                        {
                            "title": "Level",
                            "value": alert.level.value.upper(),
                            "short": True
                        },
                        {
                            "title": "Component", 
                            "value": alert.component,
                            "short": True
                        },
                        {
                            "title": "Time",
                            "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                            "short": True
                        }
                    ]
                }
            ]
        }
        
        response = requests.post(config['webhook_url'], json=payload)
        response.raise_for_status()
    
    def _send_sns_alert(self, alert: Alert, channel: NotificationChannel):
        """Send SNS alert"""
        config = channel.config
        
        if not config.get('topic_arn'):
            logger.warning("SNS channel not properly configured")
            return
        
        sns = boto3.client('sns', region_name=config.get('region', 'us-east-1'))
        
        message = f"""
        ALERT: {alert.title}
        Level: {alert.level.value.upper()}
        Component: {alert.component}
        Time: {alert.timestamp}
        
        {alert.message}
        """
        
        sns.publish(
            TopicArn=config['topic_arn'],
            Message=message,
            Subject=f"[ALERT] {alert.title}"
        )
    
    def _send_webhook_alert(self, alert: Alert, channel: NotificationChannel):
        """Send webhook alert"""
        config = channel.config
        
        if not config.get('url'):
            logger.warning("Webhook channel not properly configured")
            return
        
        payload = {
            "alert_id": alert.alert_id,
            "level": alert.level.value,
            "title": alert.title,
            "message": alert.message,
            "component": alert.component,
            "timestamp": alert.timestamp.isoformat(),
            "metadata": alert.metadata
        }
        
        response = requests.request(
            method=config.get('method', 'POST'),
            url=config['url'],
            json=payload,
            headers=config.get('headers', {})
        )
        response.raise_for_status()
    
    def _send_pagerduty_alert(self, alert: Alert, channel: NotificationChannel):
        """Send PagerDuty alert"""
        config = channel.config
        
        if not config.get('integration_key'):
            logger.warning("PagerDuty channel not properly configured")
            return
        
        payload = {
            "routing_key": config['integration_key'],
            "event_action": "trigger",
            "dedup_key": f"{alert.component}_{alert.level.value}",
            "payload": {
                "summary": alert.title,
                "source": "agent-monitoring",
                "severity": "critical" if alert.level in [AlertLevel.CRITICAL, AlertLevel.EMERGENCY] else "warning",
                "component": alert.component,
                "custom_details": {
                    "message": alert.message,
                    "metadata": alert.metadata
                }
            }
        }
        
        response = requests.post(
            config.get('service_url', 'https://events.pagerduty.com/v2/enqueue'),
            json=payload
        )
        response.raise_for_status()
    
    def process_alerts(self, metrics: Dict[str, Any]):
        """Main alert processing function"""
        # Evaluate rules and generate alerts
        new_alerts = self.evaluate_rules(metrics)
        
        # Send notifications for new alerts
        for alert in new_alerts:
            # Find which channels to use
            rule = next((r for r in self.rules if r.name == alert.component), None)
            if rule:
                self.send_alert(alert, rule.channels)
        
        # Add to history
        self.alert_history.extend(new_alerts)
        
        # Clean up old alerts (keep last 100)
        if len(self.alert_history) > 100:
            self.alert_history = self.alert_history[-100:]
        
        return new_alerts
    
    def get_active_alerts(self) -> List[Alert]:
        """Get currently active alerts"""
        return list(self.active_alerts.values())
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str = "system"):
        """Acknowledge an alert"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].acknowledged = True
            logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
    
    def resolve_alert(self, alert_id: str, resolved_by: str = "system"):
        """Resolve an alert"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].resolved = True
            logger.info(f"Alert {alert_id} resolved by {resolved_by}")
            # Remove from active alerts
            del self.active_alerts[alert_id]
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary for dashboard"""
        active_alerts = self.get_active_alerts()
        
        return {
            "active_alerts_count": len(active_alerts),
            "alerts_by_level": {
                level.value: len([a for a in active_alerts if a.level == level])
                for level in AlertLevel
            },
            "recent_alerts": [
                {
                    "id": alert.alert_id,
                    "level": alert.level.value,
                    "title": alert.title,
                    "component": alert.component,
                    "timestamp": alert.timestamp.isoformat(),
                    "acknowledged": alert.acknowledged,
                    "resolved": alert.resolved
                }
                for alert in self.alert_history[-10:]
            ]
        }

def main():
    """Example usage of AlertManager"""
    alert_manager = AlertManager()
    
    # Example metrics (would come from monitoring system)
    test_metrics = {
        'discovery_server': {
            'response_time_ms': 6000,  # This will trigger high_response_time alert
            'status': 'healthy'
        },
        'daemon_agents': {
            'active_daemon_agents': 2,  # This will trigger agent_down alert
            'total_daemon_agents': 3
        },
        'system_resources': {
            'cpu_percent': 75,
            'memory_percent': 90  # This will trigger high_memory alert
        },
        'overall_health': {
            'status': 'warning'
        },
        'deprecated_services': {
            'running_deprecated_services': []
        }
    }
    
    # Process alerts
    new_alerts = alert_manager.process_alerts(test_metrics)
    
    print("New alerts generated:")
    for alert in new_alerts:
        print(f"- {alert.level.value.upper()}: {alert.title}")
    
    # Get alert summary
    summary = alert_manager.get_alert_summary()
    print(f"\nAlert Summary: {summary}")

if __name__ == "__main__":
    main()