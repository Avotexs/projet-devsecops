import yaml
import re
import os
from typing import List, Dict, Any
from .models import Vulnerability

class RulesEngine:
    def __init__(self, rules_path: str = "src/rules/default_rules.yaml"):
        self.rules = self._load_rules(rules_path)

    def _load_rules(self, path: str) -> List[Dict]:
        if not os.path.exists(path):
            return []
        with open(path, "r") as f:
            data = yaml.safe_load(f)
            return data.get("rules", [])

    def evaluate(self, logs: List[Dict[str, Any]]) -> List[Vulnerability]:
        vulnerabilities = []
        
        for log in logs:
            for rule in self.rules:
                if self._match_rule(log, rule):
                    vulnerabilities.append(
                        Vulnerability(
                            rule_id=rule["id"],
                            severity=rule["severity"],
                            description=rule["description"],
                            affected_resource=log.get("source", "unknown"),
                            remediation=rule.get("remediation")
                        )
                    )
        return vulnerabilities

    def _match_rule(self, log: Dict[str, Any], rule: Dict) -> bool:
        # Simple matching logic
        match_key = rule.get("match_key")
        
        if not match_key:
            return False
            
        # Check if key exists in log (flattened or direct)
        # For simplicity, we assume direct key access or simple content search
        log_value = str(log.get(match_key, ""))
        
        if "match_value" in rule:
            return log_value == rule["match_value"]
            
        if "match_pattern" in rule:
            return re.search(rule["match_pattern"], log_value) is not None
            
        return False
