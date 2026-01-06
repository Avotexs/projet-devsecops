pipeline {
    agent any

    stages {
        stage('Build Microservices') {
            parallel {
                stage('Log Parser') {
                    steps {
                        script {
                            try {
                                sh 'docker build -t log-parser ./services/log-parser'
                            } catch (Exception e) {
                                echo 'Failed to build Log Parser'
                                throw e
                            }
                        }
                    }
                }
                stage('Vuln Detector') {
                    steps {
                        script {
                            try {
                                sh 'docker build -t vuln-detector ./services/vuln-detector'
                            } catch (Exception e) {
                                echo 'Failed to build Vuln Detector'
                                throw e
                            }
                        }
                    }
                }
                stage('Fix Suggester') {
                    steps {
                        script {
                            try {
                                sh 'docker build -t fix-suggester ./services/fix-suggester'
                            } catch (Exception e) {
                                echo 'Failed to build Fix Suggester'
                                throw e
                            }
                        }
                    }
                }
                stage('Anomaly Detector') {
                    steps {
                        script {
                            try {
                                sh 'docker build -t anomaly-detector ./services/anomaly-detector'
                            } catch (Exception e) {
                                echo 'Failed to build Anomaly Detector'
                                throw e
                            }
                        }
                    }
                }
                stage('Report Generator') {
                    steps {
                        script {
                            try {
                                sh 'docker build -t report-generator ./services/report-generator'
                            } catch (Exception e) {
                                echo 'Failed to build Report Generator'
                                throw e
                            }
                        }
                    }
                }
                stage('Dashboard') {
                    steps {
                        script {
                            try {
                                sh 'docker build -t dashboard ./services/dashboard'
                            } catch (Exception e) {
                                echo 'Failed to build Dashboard'
                                throw e
                            }
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline successfully completed.'
        }
        failure {
            echo 'Pipeline failed.'
        }
    }
}
