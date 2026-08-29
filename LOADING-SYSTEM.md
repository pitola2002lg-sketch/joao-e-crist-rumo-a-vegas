# Sistema profissional de carregamento de fases — João & Crist v0.9.4

## Arquitetura
- `js/runtime-stability.js`: AssetManager 2.0, cache por grupos, retry, timeout e unload de imagens.
- `js/level-loader.js`: LevelManager, manifests por fase/bônus, progresso real, cleanup e retry.
- `js/level.js`: cada Level pode liberar sua referência de background via `dispose()`.
- `js/main.js`: fluxo Menu -> Loading -> Fase, loading entre fases, cleanup, tela de erro e retry.
- `js/sound-system.js`: áudio WAV sob demanda; não cria pools de todos os sons no boot.

## Grupos
- `shared`: UI, HUD, objetos/powerups comuns e previews essenciais.
- `player:*`: frames dos personagens. Só os frames completos necessários são efetivamente carregados.
- `level:N`: background, inimigos, NPCs e bosses exclusivos da fase N.
- `bonus:bus` / `bonus:fishing`: recursos dos bônus.

## Fluxo de troca
1. Salva progresso relevante.
2. Cancela timers de fase/boss e áudio em loop.
3. Limpa inimigos, partículas, projéteis, powerups e objetos temporários.
4. Libera pixels/decoder das imagens do grupo anterior.
5. Exibe loading.
6. Carrega manifest da próxima fase com progresso baseado em arquivos reais.
7. Timeout: 12s por tentativa; 1 retry automático.
8. Se falhar, mantém tela de erro e permite Tentar Novamente.
9. Só chama `loadLevel()` depois que o manifest terminou.

## Política mobile
O preload automático da próxima fase foi desativado. A prioridade é memória, não esconder alguns segundos de loading.

## Offline/PWA
A build atual é para GitHub Pages e não possui Service Worker/PWA ativo. Portanto não houve Service Worker a preservar/alterar.
