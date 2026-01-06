import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnomalyEngine:
    """
    ML-based anomaly detection engine using IsolationForest and Autoencoder.
    
    Detects:
    - Unusual execution durations
    - Job behavior changes
    - Abnormal delays between executions
    - Resource usage anomalies
    """
    
    def __init__(self, contamination: float = 0.1):
        """
        Initialize the anomaly detection engine.
        
        Args:
            contamination: Expected proportion of anomalies in the dataset (0.0-0.5)
        """
        self.contamination = contamination
        self.scaler = StandardScaler()
        self.isolation_forest = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.autoencoder = None
        self._is_fitted = False
    
    def _build_autoencoder(self, input_dim: int):
        """Build a simple autoencoder for anomaly detection."""
        try:
            from tensorflow import keras
            from tensorflow.keras import layers
            
            # Encoder
            encoder_input = keras.Input(shape=(input_dim,))
            x = layers.Dense(32, activation='relu')(encoder_input)
            x = layers.Dense(16, activation='relu')(x)
            encoded = layers.Dense(8, activation='relu')(x)
            
            # Decoder
            x = layers.Dense(16, activation='relu')(encoded)
            x = layers.Dense(32, activation='relu')(x)
            decoded = layers.Dense(input_dim, activation='linear')(x)
            
            autoencoder = keras.Model(encoder_input, decoded)
            autoencoder.compile(optimizer='adam', loss='mse')
            
            return autoencoder
        except ImportError:
            logger.warning("TensorFlow not available, autoencoder disabled")
            return None
    
    def _extract_features(self, executions: List[Dict[str, Any]]) -> np.ndarray:
        """
        Extract numerical features from execution data.
        
        Features:
        - duration_ms: Execution duration
        - time_since_last: Time gap since previous execution
        - duration_diff: Change in duration from previous
        - cpu_usage, memory_usage: Resource metrics (if available)
        """
        if not executions:
            return np.array([]).reshape(0, 5)
        
        features = []
        prev_timestamp = None
        prev_duration = None
        
        for i, exec_data in enumerate(executions):
            duration = exec_data.get('duration_ms', 0)
            timestamp = pd.to_datetime(exec_data.get('timestamp'))
            
            # Time since last execution (in seconds)
            if prev_timestamp is not None:
                time_since_last = (timestamp - prev_timestamp).total_seconds()
            else:
                time_since_last = 0
            
            # Duration change
            if prev_duration is not None:
                duration_diff = duration - prev_duration
            else:
                duration_diff = 0
            
            # Resource usage
            resource = exec_data.get('resource_usage', {}) or {}
            cpu_usage = resource.get('cpu', 0)
            memory_usage = resource.get('memory', 0)
            
            features.append([
                duration,
                time_since_last,
                duration_diff,
                cpu_usage,
                memory_usage
            ])
            
            prev_timestamp = timestamp
            prev_duration = duration
        
        return np.array(features)
    
    def detect_with_isolation_forest(
        self, 
        executions: List[Dict[str, Any]],
        historical_data: List[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Detect anomalies using Isolation Forest algorithm.
        
        Args:
            executions: List of execution records to analyze
            historical_data: Optional historical data for training
            
        Returns:
            Tuple of (results list, summary dict)
        """
        if len(executions) < 2:
            return self._handle_insufficient_data(executions)
        
        # Combine historical and current data for training
        training_data = (historical_data or []) + executions
        features = self._extract_features(training_data)
        
        if features.shape[0] < 2:
            return self._handle_insufficient_data(executions)
        
        # Scale features
        features_scaled = self.scaler.fit_transform(features)
        
        # Fit and predict
        self.isolation_forest.fit(features_scaled)
        
        # Get predictions for current executions only
        current_features = self._extract_features(executions)
        current_scaled = self.scaler.transform(current_features)
        
        predictions = self.isolation_forest.predict(current_scaled)
        scores = self.isolation_forest.decision_function(current_scaled)
        
        # Build results
        results = []
        anomaly_count = 0
        
        for i, (exec_data, pred, score) in enumerate(zip(executions, predictions, scores)):
            is_anomaly = pred == -1
            if is_anomaly:
                anomaly_count += 1
            
            anomaly_type = self._classify_anomaly_type(
                current_features[i], 
                current_features, 
                is_anomaly
            )
            
            results.append({
                'execution_index': i,
                'timestamp': exec_data.get('timestamp'),
                'is_anomaly': is_anomaly,
                'anomaly_score': float(-score),  # Higher = more anomalous
                'anomaly_type': anomaly_type if is_anomaly else None,
                'description': self._generate_description(
                    exec_data, current_features[i], is_anomaly, anomaly_type
                )
            })
        
        summary = {
            'total_analyzed': len(executions),
            'anomalies_detected': anomaly_count,
            'anomaly_rate': anomaly_count / len(executions) if executions else 0,
            'feature_stats': {
                'mean_duration': float(np.mean(current_features[:, 0])),
                'std_duration': float(np.std(current_features[:, 0])),
                'max_duration': float(np.max(current_features[:, 0]))
            }
        }
        
        return results, summary
    
    def detect_with_autoencoder(
        self,
        executions: List[Dict[str, Any]],
        historical_data: List[Dict[str, Any]] = None,
        threshold_percentile: float = 95
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Detect anomalies using Autoencoder reconstruction error.
        
        Args:
            executions: List of execution records to analyze
            historical_data: Optional historical data for training
            threshold_percentile: Percentile for anomaly threshold
            
        Returns:
            Tuple of (results list, summary dict)
        """
        if len(executions) < 2:
            return self._handle_insufficient_data(executions)
        
        training_data = (historical_data or []) + executions
        features = self._extract_features(training_data)
        
        if features.shape[0] < 10:
            # Fall back to Isolation Forest for small datasets
            logger.info("Insufficient data for autoencoder, using Isolation Forest")
            return self.detect_with_isolation_forest(executions, historical_data)
        
        # Scale features
        features_scaled = self.scaler.fit_transform(features)
        
        # Build and train autoencoder
        if self.autoencoder is None:
            self.autoencoder = self._build_autoencoder(features.shape[1])
        
        if self.autoencoder is None:
            # TensorFlow not available
            return self.detect_with_isolation_forest(executions, historical_data)
        
        # Train autoencoder
        self.autoencoder.fit(
            features_scaled, features_scaled,
            epochs=50,
            batch_size=min(32, len(features_scaled)),
            verbose=0
        )
        
        # Get reconstruction errors for current data
        current_features = self._extract_features(executions)
        current_scaled = self.scaler.transform(current_features)
        reconstructed = self.autoencoder.predict(current_scaled, verbose=0)
        
        mse = np.mean(np.power(current_scaled - reconstructed, 2), axis=1)
        threshold = np.percentile(mse, threshold_percentile)
        
        # Build results
        results = []
        anomaly_count = 0
        
        for i, (exec_data, error) in enumerate(zip(executions, mse)):
            is_anomaly = error > threshold
            if is_anomaly:
                anomaly_count += 1
            
            anomaly_type = self._classify_anomaly_type(
                current_features[i],
                current_features,
                is_anomaly
            )
            
            results.append({
                'execution_index': i,
                'timestamp': exec_data.get('timestamp'),
                'is_anomaly': is_anomaly,
                'anomaly_score': float(error / threshold) if threshold > 0 else 0,
                'anomaly_type': anomaly_type if is_anomaly else None,
                'description': self._generate_description(
                    exec_data, current_features[i], is_anomaly, anomaly_type
                )
            })
        
        summary = {
            'total_analyzed': len(executions),
            'anomalies_detected': anomaly_count,
            'anomaly_rate': anomaly_count / len(executions) if executions else 0,
            'reconstruction_threshold': float(threshold),
            'feature_stats': {
                'mean_duration': float(np.mean(current_features[:, 0])),
                'std_duration': float(np.std(current_features[:, 0])),
                'max_duration': float(np.max(current_features[:, 0]))
            }
        }
        
        return results, summary
    
    def _classify_anomaly_type(
        self, 
        features: np.ndarray, 
        all_features: np.ndarray,
        is_anomaly: bool
    ) -> str:
        """Classify the type of anomaly based on feature analysis."""
        if not is_anomaly:
            return None
        
        duration = features[0]
        time_gap = features[1]
        duration_diff = features[2]
        
        mean_duration = np.mean(all_features[:, 0])
        std_duration = np.std(all_features[:, 0])
        
        mean_gap = np.mean(all_features[:, 1])
        std_gap = np.std(all_features[:, 1]) if np.std(all_features[:, 1]) > 0 else 1
        
        # Classify based on which feature is most anomalous
        if std_duration > 0 and abs(duration - mean_duration) > 2 * std_duration:
            return 'duration_anomaly'
        elif std_gap > 0 and abs(time_gap - mean_gap) > 2 * std_gap:
            return 'delay_anomaly'
        elif abs(duration_diff) > mean_duration * 0.5:
            return 'behavior_change'
        else:
            return 'general_anomaly'
    
    def _generate_description(
        self,
        exec_data: Dict[str, Any],
        features: np.ndarray,
        is_anomaly: bool,
        anomaly_type: str
    ) -> str:
        """Generate human-readable description of the detection result."""
        duration = features[0]
        
        if not is_anomaly:
            return f"Normal execution with duration {duration:.0f}ms"
        
        descriptions = {
            'duration_anomaly': f"Unusual duration detected: {duration:.0f}ms",
            'delay_anomaly': f"Abnormal delay between executions: {features[1]:.0f}s",
            'behavior_change': f"Significant behavior change: duration shifted by {features[2]:.0f}ms",
            'general_anomaly': f"General anomaly detected in execution pattern"
        }
        
        return descriptions.get(anomaly_type, "Anomaly detected")
    
    def _handle_insufficient_data(
        self, 
        executions: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Handle case with insufficient data for analysis."""
        results = []
        for i, exec_data in enumerate(executions):
            results.append({
                'execution_index': i,
                'timestamp': exec_data.get('timestamp'),
                'is_anomaly': False,
                'anomaly_score': 0.0,
                'anomaly_type': None,
                'description': 'Insufficient data for anomaly detection'
            })
        
        summary = {
            'total_analyzed': len(executions),
            'anomalies_detected': 0,
            'anomaly_rate': 0,
            'note': 'Insufficient data points for reliable detection'
        }
        
        return results, summary
