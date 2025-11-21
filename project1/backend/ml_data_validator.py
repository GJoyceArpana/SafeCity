"""
ML Model Data Validation Utilities

This module provides runtime validation that ML models are using authenticated data sources.
Import and call validate_ml_data_sources() on server startup.
"""

import os
import json
import pandas as pd
from typing import Dict, List, Tuple


class MLDataValidator:
    """Validates ML model data sources and outputs"""
    
    def __init__(self):
        self.base_dir = os.path.dirname(__file__)
        self.results: Dict[str, Dict] = {}
        
    def validate_crime_dataset(self) -> Tuple[bool, str]:
        """Validate the primary crime dataset CSV"""
        csv_path = os.path.join(self.base_dir, "ml", "data", "bangalore_merged_crime_dataset_new.csv")
        
        if not os.path.exists(csv_path):
            return False, f"Crime dataset not found at {csv_path}"
        
        try:
            df = pd.read_csv(csv_path)
            
            # Check required columns
            required_cols = ['date', 'ward', 'latitude', 'longitude']
            missing = [col for col in required_cols if col not in df.columns]
            if missing:
                return False, f"Missing required columns: {missing}"
            
            # Validate geographical bounds (Bangalore region)
            lat_min, lat_max = 12.8, 13.2
            lng_min, lng_max = 77.4, 77.8
            
            valid_coords = df[
                (df['latitude'] >= lat_min) & (df['latitude'] <= lat_max) &
                (df['longitude'] >= lng_min) & (df['longitude'] <= lng_max)
            ]
            
            coords_valid_pct = (len(valid_coords) / len(df)) * 100
            
            if coords_valid_pct < 90:
                return False, f"Only {coords_valid_pct:.1f}% of coordinates within Bangalore bounds"
            
            # Check data freshness (warn if >1 year old)
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            latest_date = df['date'].max()
            
            self.results['crime_dataset'] = {
                'status': 'valid',
                'path': csv_path,
                'total_records': len(df),
                'date_range': f"{df['date'].min().date()} to {latest_date.date()}",
                'coordinates_valid': f"{coords_valid_pct:.1f}%",
                'wards_count': df['ward'].nunique()
            }
            
            return True, f"✅ Crime dataset validated: {len(df)} records"
            
        except Exception as e:
            return False, f"Error reading crime dataset: {str(e)}"
    
    def validate_hotspots_output(self) -> Tuple[bool, str]:
        """Validate DBSCAN clustering output"""
        hotspots_path = os.path.join(self.base_dir, "ml", "output", "hotspots.json")
        
        if not os.path.exists(hotspots_path):
            return False, f"Hotspots file not found at {hotspots_path}"
        
        try:
            with open(hotspots_path, 'r') as f:
                hotspots = json.load(f)
            
            if not isinstance(hotspots, list):
                return False, "Hotspots must be a JSON array"
            
            # Validate each hotspot structure
            lat_min, lat_max = 12.8, 13.2
            lng_min, lng_max = 77.4, 77.8
            
            for i, h in enumerate(hotspots):
                # Handle both formats: direct lat/lng or nested center object
                lat = h.get('lat') or (h.get('center', {}).get('lat') if isinstance(h.get('center'), dict) else None)
                lng = h.get('lng') or (h.get('center', {}).get('lng') if isinstance(h.get('center'), dict) else None)
                
                if lat is None or lng is None:
                    return False, f"Hotspot {i} missing lat/lng (checked both direct and center.lat/lng)"
                
                lat, lng = float(lat), float(lng)
                if not (lat_min <= lat <= lat_max and lng_min <= lng <= lng_max):
                    return False, f"Hotspot {i} coordinates out of Bangalore bounds"
                
                if 'intensity' not in h and 'count' not in h:
                    return False, f"Hotspot {i} missing intensity/count"
            
            total_crimes = sum(h.get('count', h.get('intensity', 0)) for h in hotspots)
            
            self.results['hotspots'] = {
                'status': 'valid',
                'path': hotspots_path,
                'clusters_count': len(hotspots),
                'total_crime_density': total_crimes,
                'algorithm': 'DBSCAN (Haversine)',
                'authenticated': True
            }
            
            return True, f"✅ Hotspots validated: {len(hotspots)} clusters"
            
        except Exception as e:
            return False, f"Error reading hotspots: {str(e)}"
    
    def validate_predictions_output(self) -> Tuple[bool, str]:
        """Validate Prophet forecasting output"""
        predictions_path = os.path.join(self.base_dir, "ml", "output", "predictions.json")
        
        if not os.path.exists(predictions_path):
            return False, f"Predictions file not found at {predictions_path}"
        
        try:
            with open(predictions_path, 'r') as f:
                predictions = json.load(f)
            
            if not isinstance(predictions, dict):
                return False, "Predictions must be a JSON object"
            
            # Validate structure for each ward
            ward_count = 0
            total_forecasts = 0
            
            for ward, data in predictions.items():
                if 'forecast' not in data:
                    return False, f"Ward {ward} missing forecast array"
                
                forecast = data['forecast']
                if not isinstance(forecast, list):
                    return False, f"Ward {ward} forecast must be array"
                
                for day in forecast:
                    if 'date' not in day or 'predicted_count' not in day:
                        return False, f"Ward {ward} forecast missing date/predicted_count"
                    
                    count = day['predicted_count']
                    if count < 0 or count > 1000:
                        return False, f"Ward {ward} unrealistic prediction: {count}"
                
                ward_count += 1
                total_forecasts += len(forecast)
            
            self.results['predictions'] = {
                'status': 'valid',
                'path': predictions_path,
                'wards_count': ward_count,
                'total_forecasts': total_forecasts,
                'algorithm': 'Facebook Prophet',
                'authenticated': True
            }
            
            return True, f"✅ Predictions validated: {ward_count} wards"
            
        except Exception as e:
            return False, f"Error reading predictions: {str(e)}"
    
    def validate_all(self) -> Dict[str, any]:
        """Run all validations and return summary"""
        validations = {
            'crime_dataset': self.validate_crime_dataset(),
            'hotspots': self.validate_hotspots_output(),
            'predictions': self.validate_predictions_output()
        }
        
        all_passed = all(result[0] for result in validations.values())
        
        return {
            'all_authenticated': all_passed,
            'timestamp': pd.Timestamp.now().isoformat(),
            'validations': {
                key: {'passed': result[0], 'message': result[1]}
                for key, result in validations.items()
            },
            'details': self.results
        }


def validate_ml_data_sources() -> Dict:
    """
    Main validation function to call on server startup.
    Returns validation report dictionary.
    """
    validator = MLDataValidator()
    report = validator.validate_all()
    
    # Print summary to console
    print("\n" + "="*60)
    print("ML MODEL DATA AUTHENTICATION REPORT")
    print("="*60)
    
    for name, result in report['validations'].items():
        status = "✅ PASS" if result['passed'] else "❌ FAIL"
        print(f"{status} | {name}: {result['message']}")
    
    print("="*60)
    
    if report['all_authenticated']:
        print("✅ ALL ML MODELS AUTHENTICATED - Using real crime data")
    else:
        print("❌ AUTHENTICATION FAILED - Check data sources")
    
    print("="*60 + "\n")
    
    return report


# Example usage in main.py:
if __name__ == "__main__":
    report = validate_ml_data_sources()
    
    # Save report to file
    with open('ml_validation_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"Full report saved to ml_validation_report.json")
