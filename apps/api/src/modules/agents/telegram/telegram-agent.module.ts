import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { TelegramAgentService } from './telegram-agent.service';
import { TelegramAgentController } from './telegram-agent.controller';
import { TelegramBotService } from './telegram-bot.service';
import { ImageGeneratorService } from './image-generator.service';
import { VideoGeneratorService } from './video-generator.service';
import { TikTokUploaderService } from './tiktok-uploader.service';
import { ZaloPersonalService } from './zalo-personal.service';
import { FacebookGroupsService } from './facebook-groups.service';
import { AiVideoPipelineService } from './ai-video-pipeline.service';
import { AiModule } from '../../ai/ai.module';
import { PriorityBrandsService } from './priority-brands.service';
import { ProductScoreService } from './product-score.service';
import { HookAgentService } from './hook-agent.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';
import { RecycleService } from './recycle.service';
import { AiRankingAgentService } from './ai-ranking-agent.service';
import { KillSwitchService } from './kill-switch.service';
import { SelfOptimizationEngineService } from './self-optimization-engine.service';
import { EngagementScoreService } from './engagement-score.service';
import { ContentRankEngineService } from './content-rank-engine.service';
import { ContentTestEngineService } from './content-test-engine.service';
import { MicroDistributionService } from './micro-distribution.service';
import { DistributionWeightService } from './distribution-weight.service';
import { AutoBoostService } from './auto-boost.service';
import { AutoKillService } from './auto-kill.service';
import { TikTokAdsLayerService } from './tiktok-ads-layer.service';
import { EventCollectorService } from './event-collector.service';
import { ProfitScoreService } from './profit-score.service';
import { ProductLifecycleService } from './product-lifecycle.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { AiInsightService } from './ai-insight.service';
import { SmartDistributionService } from './smart-distribution.service';
import { AdaptiveContentService } from './adaptive-content.service';
import { AutonomousDecisionService } from './autonomous-decision.service';
import { SelfRegulationService } from './self-regulation.service';
import { AutoScaleService } from './auto-scale.service';
import { AutoDownrankService } from './auto-downrank.service';
import { RevenueBrainService } from './revenue-brain.service';

// next1 — Zero-Touch Control Layer
import { ZeroTouchControlTowerService } from './zero-touch-control-tower.service';
import { SystemHealthMonitorService } from './system-health-monitor.service';
import { AutoRecoveryService } from './auto-recovery.service';
import { SmartFallbackRouterService } from './smart-fallback-router.service';
import { RevenueStabilityService } from './revenue-stability.service';
import { AutoScalingGovernorService } from './auto-scaling-governor.service';
import { ChannelBalancerService } from './channel-balancer.service';
import { ContentFrequencyService } from './content-frequency.service';
import { AffiliateLinkGuardianService } from './affiliate-link-guardian.service';
import { ContentIntegrityService } from './content-integrity.service';

// next2 — Self-Evolving Revenue AI
import { RevenueStrategyBrainService } from './revenue-strategy-brain.service';
import { StrategyGenomeService } from './strategy-genome.service';
import { StrategyEvaluatorService } from './strategy-evaluator.service';
import { StrategyMutationService } from './strategy-mutation.service';
import { StrategyCeoService } from './strategy-ceo.service';
import { StrategyAbTestService } from './strategy-ab-test.service';
import { StrategyDriftService } from './strategy-drift.service';
import { MarketAdaptationService } from './market-adaptation.service';
import { RevenueRegimeService } from './revenue-regime.service';
import { StrategyMemoryService } from './strategy-memory.service';
import { PatternMiningService } from './pattern-mining.service';
import { StrategyLearningService } from './strategy-learning.service';

// next3 — Autonomous Business OS
import { AiCeoBrainService } from './ai-ceo-brain.service';
import { BusinessModelRegistryService } from './business-model-registry.service';
import { ModelPerformanceEvaluatorService } from './model-performance-evaluator.service';
import { CapitalAllocationService } from './capital-allocation.service';
import { BusinessExperimentService } from './business-experiment.service';
import { BusinessKillSwitchService } from './business-kill-switch.service';
import { BusinessGrowthService } from './business-growth.service';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { KpiIntelligenceService } from './kpi-intelligence.service';
import { DecisionSummaryService } from './decision-summary.service';

// next4 — Revenue Empire
import { RevenueEmpireBrainService } from './revenue-empire-brain.service';
import { EconomicMapService } from './economic-map.service';
import { CapitalFlowControllerService } from './capital-flow-controller.service';
import { IndustryBuilderService } from './industry-builder.service';
import { MarketCollapseDetectorService } from './market-collapse-detector.service';
import { EconomicReallocationService } from './economic-reallocation.service';
import { CompanyBuilderService } from './company-builder.service';
import { RevenueDefenseService } from './revenue-defense.service';
import { EconomicSimulationService } from './economic-simulation.service';
import { EmpireStrategyService } from './empire-strategy.service';

// next5 — Self-Replicating Revenue Intelligence
import { RevenueDnaEngineService } from './revenue-dna-engine.service';
import { SystemClonerService } from './system-cloner.service';
import { BusinessInstanceManagerService } from './business-instance-manager.service';
import { InstanceComparatorService } from './instance-comparator.service';
import { NaturalSelectionService } from './natural-selection.service';
import { SrriStrategyMutationService } from './srri-strategy-mutation.service';
import { RevenueInstanceFactoryService } from './revenue-instance-factory.service';
import { InstanceMemoryService } from './instance-memory.service';
import { CrossInstanceLearningService } from './cross-instance-learning.service';
import { ReplicationMetaControllerService } from './replication-meta-controller.service';
import { RevenueGenomeEvolutionService } from './revenue-genome-evolution.service';
import { EcosystemStabilizerService } from './ecosystem-stabilizer.service';

// next6 — Autonomous Revenue Civilization
import { RevenueCivilizationBrainService } from './revenue-civilization-brain.service';
import { EconomicRegionsService } from './economic-regions.service';
import { CivilizationResourceAllocatorService } from './civilization-resource-allocator.service';
import { InterRegionTradeService } from './inter-region-trade.service';
import { CivilizationGrowthService } from './civilization-growth.service';
import { CivilizationCollapseService } from './civilization-collapse.service';
import { CivilizationGovernanceAiService } from './civilization-governance-ai.service';
import { CivilizationOrchestratorService } from './civilization-orchestrator.service';
import { CivilizationComparatorService } from './civilization-comparator.service';
import { CivilizationMergerService } from './civilization-merger.service';
import { CivilizationSimulationService } from './civilization-simulation.service';
import { MacroEconomyPredictorService } from './macro-economy-predictor.service';

// next7 — Autonomous Revenue Multiverse
import { RevenueMultiverseBrainService } from './revenue-multiverse-brain.service';
import { UniverseGeneratorService } from './universe-generator.service';
import { UniverseIsolationService } from './universe-isolation.service';
import { CrossUniverseMigrationService } from './cross-universe-migration.service';
import { UniverseRankingService } from './universe-ranking.service';
import { UniverseLifecycleService } from './universe-lifecycle.service';
import { MultiverseInvestmentService } from './multiverse-investment.service';
import { PatternTransferService } from './pattern-transfer.service';
import { UniverseMutationService } from './universe-mutation.service';
import { MultiverseSimulationService } from './multiverse-simulation.service';
import { MultiverseControllerService } from './multiverse-controller.service';
import { ResourceArbitrageService } from './resource-arbitrage.service';
import { MultiverseStabilityService } from './multiverse-stability.service';

// next8 — Infinite Self-Improving Revenue Singularity
import { RevenueSingularityBrainService } from './revenue-singularity-brain.service';
import { MetaLearningEngineService } from './meta-learning-engine.service';
import { StrategyGeneratorGeneratorService } from './strategy-generator-generator.service';
import { RecursiveOptimizationService } from './recursive-optimization.service';
import { ConstraintBreakerService } from './constraint-breaker.service';
import { EvolutionAmplifierService } from './evolution-amplifier.service';
import { IntelligenceCompressionService } from './intelligence-compression.service';
import { RecursiveRevenueExpansionService } from './recursive-revenue-expansion.service';
import { InfiniteExplorationService } from './infinite-exploration.service';
import { SingularityGovernorService } from './singularity-governor.service';
import { StabilityEvolutionBalancerService } from './stability-evolution-balancer.service';
import { SelfLimitationDetectorService } from './self-limitation-detector.service';

// next9 — Post-Singularity Autonomous Reality Engine
import { RevenueRealityGeneratorService } from './revenue-reality-generator.service';
import { EconomicPhysicsEngineService } from './economic-physics-engine.service';
import { ParallelRealitySimulatorService } from './parallel-reality-simulator.service';
import { RealitySurvivalEngineService } from './reality-survival-engine.service';
import { RealtiyForkingService } from './reality-forking.service';
import { RealityMergeService } from './reality-merge.service';
import { RealityCollapseDetectorService } from './reality-collapse-detector.service';
import { RealityGovernorService } from './reality-governor.service';
import { RealityCapitalAllocatorService } from './reality-capital-allocator.service';
import { RealityIntelligenceTransferService } from './reality-intelligence-transfer.service';

// next10 — Ultimate Infinite Meta-System
import { UltimateMetaOriginBrainService } from './ultimate-meta-origin-brain.service';
import { SystemPossibilityGeneratorService } from './system-possibility-generator.service';
import { MetaSystemConstructorService } from './meta-system-constructor.service';
import { InfiniteStrategySpaceService } from './infinite-strategy-space.service';
import { SystemRegenerationService } from './system-regeneration.service';
import { MetaAbstractionService } from './meta-abstraction.service';
import { SelfDefinitionEngineService } from './self-definition-engine.service';
import { EvolutionCascadeService } from './evolution-cascade.service';
import { ConceptCompressionService } from './concept-compression.service';
import { UimsMetaControllerService } from './uims-meta-controller.service';
import { PriorityArbiterService } from './priority-arbiter.service';
import { ResourceReallocatorService } from './resource-reallocator.service';

// next11 — Pre-Conceptual Revenue Engine
import { PreconceptFieldGeneratorService } from './preconcept-field-generator.service';
import { PreSemanticEngineService } from './pre-semantic-engine.service';
import { IntentEmergenceService } from './intent-emergence.service';
import { ValueGenesisService } from './value-genesis.service';
import { PreLogicMutationService } from './pre-logic-mutation.service';
import { ProbabilityFieldService } from './probability-field.service';
import { AttentionValueTransitionService } from './attention-value-transition.service';
import { PreRealityService } from './pre-reality.service';
import { FieldOrchestratorService } from './field-orchestrator.service';
import { EmergenceStabilizerService } from './emergence-stabilizer.service';
import { PreSystemEvolutionService } from './pre-system-evolution.service';

// next12 — Non-Existence Revenue Layer
import { NullStateEngineService } from './null-state-engine.service';
import { AntiConceptService } from './anti-concept.service';
import { PreCausalityEngineService } from './pre-causality-engine.service';
import { VoidInfluenceFieldService } from './void-influence-field.service';
import { ZeroSemanticProcessorService } from './zero-semantic-processor.service';
import { NonRepresentationEngineService } from './non-representation-engine.service';
import { AbsenceAmplificationService } from './absence-amplification.service';
import { SilentImpactService } from './silent-impact.service';
import { NullGovernorService } from './null-governor.service';
import { AntiMetricService } from './anti-metric.service';
import { RealityDriftInjectorService } from './reality-drift-injector.service';

const OPTIMIZATION_PROVIDERS = [
  ProductScoreService,
  HookAgentService,
  AffiliateTrackerService,
  ContentVariantService,
  RecycleService,
  AiRankingAgentService,
  KillSwitchService,
  SelfOptimizationEngineService,
];

const TIKTOK_ADS_PROVIDERS = [
  EngagementScoreService,
  ContentRankEngineService,
  ContentTestEngineService,
  MicroDistributionService,
  DistributionWeightService,
  AutoBoostService,
  AutoKillService,
  TikTokAdsLayerService,
];

const REVENUE_AI_PROVIDERS = [
  EventCollectorService,
  ProfitScoreService,
  ProductLifecycleService,
  RevenueAnalyticsService,
  AiInsightService,
  SmartDistributionService,
  AdaptiveContentService,
  AutonomousDecisionService,
  SelfRegulationService,
  AutoScaleService,
  AutoDownrankService,
  RevenueBrainService,
];

const ZERO_TOUCH_PROVIDERS = [
  ZeroTouchControlTowerService,
  SystemHealthMonitorService,
  AutoRecoveryService,
  SmartFallbackRouterService,
  RevenueStabilityService,
  AutoScalingGovernorService,
  ChannelBalancerService,
  ContentFrequencyService,
  AffiliateLinkGuardianService,
  ContentIntegrityService,
];

const SELF_EVOLVING_PROVIDERS = [
  RevenueStrategyBrainService,
  StrategyGenomeService,
  StrategyEvaluatorService,
  StrategyMutationService,
  StrategyCeoService,
  StrategyAbTestService,
  StrategyDriftService,
  MarketAdaptationService,
  RevenueRegimeService,
  StrategyMemoryService,
  PatternMiningService,
  StrategyLearningService,
];

const BUSINESS_OS_PROVIDERS = [
  AiCeoBrainService,
  BusinessModelRegistryService,
  ModelPerformanceEvaluatorService,
  CapitalAllocationService,
  BusinessExperimentService,
  BusinessKillSwitchService,
  BusinessGrowthService,
  ExecutiveDashboardService,
  KpiIntelligenceService,
  DecisionSummaryService,
];

const REVENUE_EMPIRE_PROVIDERS = [
  RevenueEmpireBrainService,
  EconomicMapService,
  CapitalFlowControllerService,
  IndustryBuilderService,
  MarketCollapseDetectorService,
  EconomicReallocationService,
  CompanyBuilderService,
  RevenueDefenseService,
  EconomicSimulationService,
  EmpireStrategyService,
];

const SRRI_PROVIDERS = [
  RevenueDnaEngineService,
  SystemClonerService,
  BusinessInstanceManagerService,
  InstanceComparatorService,
  NaturalSelectionService,
  SrriStrategyMutationService,
  RevenueInstanceFactoryService,
  InstanceMemoryService,
  CrossInstanceLearningService,
  ReplicationMetaControllerService,
  RevenueGenomeEvolutionService,
  EcosystemStabilizerService,
];

const CIVILIZATION_PROVIDERS = [
  RevenueCivilizationBrainService,
  EconomicRegionsService,
  CivilizationResourceAllocatorService,
  InterRegionTradeService,
  CivilizationGrowthService,
  CivilizationCollapseService,
  CivilizationGovernanceAiService,
  CivilizationOrchestratorService,
  CivilizationComparatorService,
  CivilizationMergerService,
  CivilizationSimulationService,
  MacroEconomyPredictorService,
];

const MULTIVERSE_PROVIDERS = [
  RevenueMultiverseBrainService,
  UniverseGeneratorService,
  UniverseIsolationService,
  CrossUniverseMigrationService,
  UniverseRankingService,
  UniverseLifecycleService,
  MultiverseInvestmentService,
  PatternTransferService,
  UniverseMutationService,
  MultiverseSimulationService,
  MultiverseControllerService,
  ResourceArbitrageService,
  MultiverseStabilityService,
];

const SINGULARITY_PROVIDERS = [
  RevenueSingularityBrainService,
  MetaLearningEngineService,
  StrategyGeneratorGeneratorService,
  RecursiveOptimizationService,
  ConstraintBreakerService,
  EvolutionAmplifierService,
  IntelligenceCompressionService,
  RecursiveRevenueExpansionService,
  InfiniteExplorationService,
  SingularityGovernorService,
  StabilityEvolutionBalancerService,
  SelfLimitationDetectorService,
];

const REALITY_ENGINE_PROVIDERS = [
  RevenueRealityGeneratorService,
  EconomicPhysicsEngineService,
  ParallelRealitySimulatorService,
  RealitySurvivalEngineService,
  RealtiyForkingService,
  RealityMergeService,
  RealityCollapseDetectorService,
  RealityGovernorService,
  RealityCapitalAllocatorService,
  RealityIntelligenceTransferService,
];

const META_SYSTEM_PROVIDERS = [
  UltimateMetaOriginBrainService,
  SystemPossibilityGeneratorService,
  MetaSystemConstructorService,
  InfiniteStrategySpaceService,
  SystemRegenerationService,
  MetaAbstractionService,
  SelfDefinitionEngineService,
  EvolutionCascadeService,
  ConceptCompressionService,
  UimsMetaControllerService,
  PriorityArbiterService,
  ResourceReallocatorService,
];

const PRE_CONCEPTUAL_PROVIDERS = [
  PreconceptFieldGeneratorService,
  PreSemanticEngineService,
  IntentEmergenceService,
  ValueGenesisService,
  PreLogicMutationService,
  ProbabilityFieldService,
  AttentionValueTransitionService,
  PreRealityService,
  FieldOrchestratorService,
  EmergenceStabilizerService,
  PreSystemEvolutionService,
];

const NON_EXISTENCE_PROVIDERS = [
  NullStateEngineService,
  AntiConceptService,
  PreCausalityEngineService,
  VoidInfluenceFieldService,
  ZeroSemanticProcessorService,
  NonRepresentationEngineService,
  AbsenceAmplificationService,
  SilentImpactService,
  NullGovernorService,
  AntiMetricService,
  RealityDriftInjectorService,
];

const ALL_PROVIDERS = [
  TelegramAgentService,
  TelegramBotService,
  ImageGeneratorService,
  VideoGeneratorService,
  TikTokUploaderService,
  ZaloPersonalService,
  FacebookGroupsService,
  AiVideoPipelineService,
  PriorityBrandsService,
  ...OPTIMIZATION_PROVIDERS,
  ...TIKTOK_ADS_PROVIDERS,
  ...REVENUE_AI_PROVIDERS,
  ...ZERO_TOUCH_PROVIDERS,
  ...SELF_EVOLVING_PROVIDERS,
  ...BUSINESS_OS_PROVIDERS,
  ...REVENUE_EMPIRE_PROVIDERS,
  ...SRRI_PROVIDERS,
  ...CIVILIZATION_PROVIDERS,
  ...MULTIVERSE_PROVIDERS,
  ...SINGULARITY_PROVIDERS,
  ...REALITY_ENGINE_PROVIDERS,
  ...META_SYSTEM_PROVIDERS,
  ...PRE_CONCEPTUAL_PROVIDERS,
  ...NON_EXISTENCE_PROVIDERS,
];

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog]), AiModule],
  providers: ALL_PROVIDERS,
  controllers: [TelegramAgentController],
  exports: ALL_PROVIDERS,
})
export class TelegramAgentModule {}
