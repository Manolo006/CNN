import os
import json
from pathlib import Path
import discord
from discord.ext import commands
import asyncio
import aiohttp
import time
import requests
import traceback
import atexit
import signal

# -------------------------------
# CONFIG
# -------------------------------
# The bot token is read from the environment variable `DISCORD_TOKEN` for safety.
TOKEN = "MTQ0NzY4NTkzNDI2NTkyOTkxMA.GydOqe.SpWg7UYI-WR9VJ5MRiNzJc37dSodYd486_PIEY"

GUILD_ID = 1021052038341206046  # ID server
KICK_DELAY = 1                # secondi prima del kick

# default controllers (replace with your IDs if you want a different default)
DEFAULT_CONTROLLERS = {1289645133729370236, 590163355839496192}

# Live timer online user
FIREBASE_URL = "https://discord-live-stats-default-rtdb.firebaseio.com/voicetime"
FIREBASE_URL_GUILD = "https://discord-live-stats-default-rtdb.firebaseio.com/guild.json"
FIREBASE_URL_TARGETS = "https://discord-live-stats-default-rtdb.firebaseio.com/targets.json"
FIREBASE_URL_CONTROLLERS = "https://discord-live-stats-default-rtdb.firebaseio.com/controllers.json"
FIREBASE_URL_STATUS = "https://discord-live-stats-default-rtdb.firebaseio.com/bot/status.json"
FIREBASE_URL_HEARTBEAT = "https://discord-live-stats-default-rtdb.firebaseio.com/bot/heartbeat.json"
FIREBASE_URL_COMMANDS = "https://discord-live-stats-default-rtdb.firebaseio.com/commands/start.json"

#Log for timer



def load_controllers():
    try:
        r = requests.get(FIREBASE_URL_CONTROLLERS, timeout=10)
        if r.status_code == 200 and r.json():
            data = r.json()
            # Support both: { "controllers": [...] } and raw list [...] at /controllers.json
            if isinstance(data, list):
                ids = data
            else:
                ids = data.get("controllers", [])
            if ids:
                return set(int(x) for x in ids)
    except Exception as e:
        print(f"[controllers] errore lettura Firebase: {e}")
        traceback.print_exc()
    return set(DEFAULT_CONTROLLERS)


def update_controllers_firebase(ids_set):
    try:
        payload = {"controllers": [int(x) for x in ids_set]}
        r = requests.put(FIREBASE_URL_CONTROLLERS, json=payload, timeout=10)
        if r.status_code in (200, 201):
            print(f"[controllers] Firebase aggiornato: {payload}")
        else:
            print(f"[controllers] errore PUT {r.status_code}: {r.text}")
    except Exception as e:
        print(f"[controllers] errore aggiornamento Firebase: {e}")
        traceback.print_exc()


def save_controllers(ids_set):
    try:
        update_controllers_firebase(ids_set)
    except Exception as e:
        print("ERRORE SALVATAGGIO CONTROLLERS:", e)


def load_target():
    try:
        r = requests.get(FIREBASE_URL_TARGETS, timeout=10)
        if r.status_code == 200 and r.json():
            data = r.json()
            # Support both: { "targets": [...] } and raw list [...] at /targets.json
            if isinstance(data, list):
                targets = data
            else:
                targets = data.get("targets", [])
            if targets:
                return [int(x) for x in targets]
    except Exception as e:
        print(f"[targets] errore lettura Firebase: {e}")
        traceback.print_exc()
    raise SystemExit("Targets non trovati su Firebase. Imposta /targets.json con un array 'targets'.")


def update_targets_firebase(target_ids):
    try:
        payload = {"targets": [int(x) for x in target_ids]}
        r = requests.put(FIREBASE_URL_TARGETS, json=payload, timeout=10)
        if r.status_code in (200, 201):
            print(f"[targets] Firebase aggiornato: {payload}")
        else:
            print(f"[targets] errore PUT {r.status_code}: {r.text}")
    except Exception as e:
        print(f"[targets] errore aggiornamento Firebase: {e}")
        traceback.print_exc()


def save_target(target_ids):
    try:
        update_targets_firebase(target_ids)
    except Exception as e:
        print("ERRORE SALVATAGGIO TARGET:", e)

def refresh_controllers():
    global CONTROL_USER_IDS
    try:
        CONTROL_USER_IDS = load_controllers()
    except Exception as e:
        print(f"[controllers] refresh fallito, uso cache: {e}")


def refresh_targets():
    global TARGET_ID
    try:
        TARGET_ID = load_target()
    except SystemExit as e:
        print(f"[targets] refresh fallito, uso cache: {e}")
    except Exception as e:
        print(f"[targets] refresh fallito, uso cache: {e}")


CONTROL_USER_IDS = load_controllers()
TARGET_ID = load_target()  # Now a list of target IDs

# Optional GIF to show in unauthorized messages. Set to an image/GIF URL or leave empty.
AUTH_GIF_URL = "https://media.tenor.com/0CljOyp-rU8AAAAM/tf2-scout-tf2.gif"

# -------------------------------
# SETUP BOT
# -------------------------------
intents = discord.Intents.all()
intents.message_content = True
intents.voice_states = True
intents.guilds = True
intents.members = True
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# -------------------------------
# TRACKING
# -------------------------------
voice_times = {}       # {user_id: total_seconds}
active_sessions = {}   # {user_id: timestamp_inizio}
autosave_task = None     # riferimento alla task
heartbeat_task = None    # riferimento alla task
command_task = None      # riferimento alla task

# -------------------------------
# KICK FUNCTIONS
# -------------------------------
kick_active = False  # Variabile globale per controllare lo stato
kick_task = None


async def kick_loop():
    """Background task: while the bot is running, when `kick_active` is True
    repeatedly check whether any target is in voice and kick them.
    """
    await bot.wait_until_ready()
    global kick_active
    while not bot.is_closed():
        if kick_active:
            refresh_targets()
            guild = bot.get_guild(GUILD_ID)
            if guild:
                for target_id in TARGET_ID:
                    member = guild.get_member(target_id)
                    if member and member.voice and member.voice.channel:
                        print(f"{member.name} è in call: kick tra {KICK_DELAY} secondi...")
                        await asyncio.sleep(KICK_DELAY)
                        # Re-check in case they left
                        if member and member.voice and member.voice.channel:
                            try:
                                await member.move_to(None)
                                print(f"{member.name} è stato kickato dalla call.")
                            except Exception as e:
                                print("ERRORE:", e)
        await asyncio.sleep(1)

def fetch_commands():
    try:
        r = requests.get(FIREBASE_URL_COMMANDS, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"[commands] errore lettura Firebase: {e}")
        traceback.print_exc()
    return {}

async def handle_start_action():
    global kick_active, kick_task
    if kick_active:
        return
    kick_active = True
    if kick_task is None or kick_task.done():
        kick_task = asyncio.create_task(kick_loop())

async def handle_stop_action():
    global kick_active, kick_task
    if not kick_active:
        return
    kick_active = False
    if kick_task and not kick_task.done():
        kick_task.cancel()
        try:
            await kick_task
        except asyncio.CancelledError:
            pass
    kick_task = None


# -------------------------------
# Carica dati da Firebase all'avvio
# -------------------------------
def load_firebase():
    global voice_times
    try:
        r = requests.get(FIREBASE_URL + ".json", timeout=10)
        if r.status_code == 200 and r.json():
            voice_times = {int(k): v.get("seconds", 0) for k, v in r.json().items()}
            print("[tracktime] dati caricati:", voice_times)
        else:
            print("[tracktime] nessun dato presente su Firebase")
    except Exception as e:
        print("[tracktime] errore caricamento Firebase:", e)
        traceback.print_exc()

load_firebase()

# Funzione per salvare log su firebase diretto
def log_to_firebase(user_id, start_ts, end_ts, duration, channel_name=None):
    url = f"https://discord-live-stats-default-rtdb.firebaseio.com/voicelog/{user_id}.json"
    
    payload = {
        "start": int(start_ts),
        "end": int(end_ts),
        "duration": int(duration),
        "channel": channel_name,
        "created_at": int(time.time())
    }

    try:
        r = requests.post(url, json=payload, timeout=10)
        if r.status_code in (200, 201):
            print(f"[voicelog] log salvato per {user_id}")
        else:
            print(f"[voicelog] errore POST {r.status_code}: {r.text}")
    except Exception as e:
        print(f"[voicelog] errore invio Firebase:", e)
        traceback.print_exc()

# Funzione per salvare log locale
#def log_to_file(user_id, start_ts, end_ts, duration):
#    try:
#        with open(LOG_FILE, "a", encoding="utf-8") as f:
#            f.write(f"{user_id} | start: {start_ts} | end: {end_ts} | duration: {duration}s\n")
#    except Exception as e:
#        print(f"[tracktime] errore scrittura log: {e}")

# Aggiorna Firebase
def update_firebase(user_id, seconds, username=None, avatar_url=None):
    url = f"{FIREBASE_URL}/{user_id}.json"
    payload = {"seconds": int(seconds)}
    if username:
        payload["username"] = username
    if avatar_url:
        payload["avatar"] = avatar_url
    try:
        r = requests.patch(url, json=payload, timeout=10)
        if r.status_code in (200, 204):
            print(f"[tracktime] Firebase aggiornato: {user_id}={seconds}s")
        else:
            print(f"[tracktime] errore PATCH {user_id}: {r.status_code}, {r.text}")
    except Exception as e:
        print(f"[tracktime] errore aggiornamento Firebase {user_id}: {e}")
        traceback.print_exc()

def set_bot_status(online: bool):
    try:
        r = requests.put(FIREBASE_URL_STATUS, json=bool(online), timeout=10)
        if r.status_code not in (200, 201):
            print(f"[status] errore PUT {r.status_code}: {r.text}")
    except Exception as e:
        print(f"[status] errore aggiornamento Firebase: {e}")
        traceback.print_exc()

def update_heartbeat():
    """Write server-side heartbeat timestamp (unix seconds)."""
    try:
        r = requests.put(FIREBASE_URL_HEARTBEAT, json=int(time.time()), timeout=10)
        if r.status_code not in (200, 201):
            print(f"[heartbeat] errore PUT {r.status_code}: {r.text}")
    except Exception as e:
        print(f"[heartbeat] errore aggiornamento Firebase: {e}")
        traceback.print_exc()

# -------------------------------
# EVENTI
# -------------------------------
@bot.event
async def on_ready():
    global autosave_task, heartbeat_task, command_task
    print(f"Bot avviato come {bot.user}")
    set_bot_status(True)
    update_heartbeat()

    # avvia autosave_task solo una volta
    if autosave_task is None or autosave_task.done():
        autosave_task = asyncio.create_task(autosave_loop())
        print("Autosave avviato!")
    if heartbeat_task is None or heartbeat_task.done():
        heartbeat_task = asyncio.create_task(heartbeat_loop())
        print("Heartbeat avviato!")
    if command_task is None or command_task.done():
        command_task = asyncio.create_task(command_loop())
        print("Command loop avviato!")

    guild = bot.get_guild(GUILD_ID)
    if guild:
        for vc in guild.voice_channels:
            for member in vc.members:
                active_sessions[member.id] = time.time()
                print(f"[READY] {member} era già in vocale → timestamp creato")


async def send_unauthorized(ctx):
    """Send a friendly unauthorized message. If AUTH_GIF_URL is set, send it embedded."""
    text = "Non autorizzato. Non hai i permessi per usare questo comando. ❌"
    if AUTH_GIF_URL:
        embed = discord.Embed(description=text)
        embed.set_image(url=AUTH_GIF_URL)
        await ctx.send(embed=embed)
    else:
        await ctx.send(text)


@bot.event
async def on_voice_state_update(member, before, after):
    user_id = member.id
    now = time.time()

    # Log changes
    before_chan = before.channel.name if before and getattr(before, 'channel', None) else None
    after_chan = after.channel.name if after and getattr(after, 'channel', None) else None
    print(f"EVENTO VOICE_STATE: {member} - before: {before_chan} after: {after_chan}")

    # Kick logic
    if kick_active:
        refresh_targets()
    if kick_active and user_id in TARGET_ID:
        if before.channel is None and after.channel is not None:
            print(f"[KICK] {member.name} è entrato in vocal: kick in {KICK_DELAY}s…")
            await asyncio.sleep(KICK_DELAY)

            if member.voice and member.voice.channel:
                try:
                    await member.move_to(None)
                    print(f"[KICK] {member.name} kickato.")
                except Exception as e:
                    print("[KICK ERROR]:", e)

# ---------------------------------------------------------------------------------------
    # 3) TRACKING TEMPO
    # ---------------------------------------------------------------------------------------

    # --- ENTRATA ---
    if before.channel is None and after.channel is not None:
        active_sessions[user_id] = now
        print(f"[TIME] {member.name} è entrato. Start={now}")
        return

    # --- USCITA ---
    if before.channel is not None and after.channel is None:
        start = active_sessions.pop(user_id, None)
        if start:
            duration = int(now - start)
            total = voice_times.get(user_id, 0) + duration
            voice_times[user_id] = total

            log_to_firebase(user_id,start,now,duration,channel_name=before.channel.name)

            update_firebase(user_id, total, username=member.name,
                            avatar_url=member.display_avatar.url)

            print(f"[TIME] {member.name} è uscito. Sessione={duration}s Totale={total}s")
        return

    # --- CAMBIO CANALE ---
    if before.channel is not None and after.channel is not None and before.channel.id != after.channel.id:
        print(f"[TIME] {member.name} ha cambiato stanza: {before.channel.name} → {after.channel.name}")

        # chiudere sessione precedente
        start = active_sessions.get(user_id)
        if start:
            duration = int(now - start)
            total = voice_times.get(user_id, 0) + duration
            voice_times[user_id] = total

            log_to_firebase(user_id,start,now,duration,channel_name=before.channel.name)
            update_firebase(user_id, total, username=member.name,
                            avatar_url=member.display_avatar.url)

            print(f"[TIME] Cambio stanza, sessione chiusa: {duration}s Totale={total}s")

        # apri subito una nuova sessione
        active_sessions[user_id] = now
        print(f"[TIME] Nuova sessione iniziata per {member.name} in {after.channel.name}")
        return
    

# -------------------------------
# AUTO SAVE PERIODICO (es. ogni 5 secondi per test; poi metti 600 per 10 minuti)
# -------------------------------
AUTO_SAVE_INTERVAL = 600  # per test; cambialo a 600 per 10 minuti


async def autosave_loop():
    global autosave_task
    try:
        await bot.wait_until_ready()
        print("[autosave] autosave_loop in esecuzione, interval:", AUTO_SAVE_INTERVAL)
        while not bot.is_closed():
            now = time.time()
            # copia chiavi per evitare RuntimeError se active_sessions muta durante il loop
            for user_id, start_ts in list(active_sessions.items()):
                try:
                    # durata dall'ultimo start
                    duration = int(now - start_ts)
                    if duration <= 0:
                        continue

                    # aggiorna il totale in memoria
                    total = voice_times.get(user_id, 0) + duration
                    voice_times[user_id] = total

                    # aggiorna anche il file di log locale
                    try:
                        log_to_firebase(user_id, start, now, duration, channel_name=channel_name)
                    except Exception as e:
                        print(f"[autosave] errore log_to_file per {user_id}: {e}")

                    # prendi member per username/avatar se possibile
                    username = None
                    avatar = None
                    channel_name = None
                    try:
                        guild = bot.get_guild(GUILD_ID)
                        if guild:
                            member = guild.get_member(user_id)
                            if member:
                                username = member.name
                                try:
                                    avatar = member.display_avatar.url
                                except Exception:
                                    avatar = None
                                try:
                                    if member.voice and member.voice.channel:
                                        channel_name = member.voice.channel.name
                                except Exception:
                                    channel_name = None
                    except Exception as e:
                        print(f"[autosave] errore recupero member {user_id}: {e}")

                    # aggiorna Firebase con il totale
                    try:
                        update_firebase(user_id, total, username=username, avatar_url=avatar)
                        print(f"[autosave] salvati {duration}s per {user_id} (tot={total}s)")
                    except Exception as e:
                        print(f"[autosave] errore update_firebase per {user_id}: {e}")

                    # resetta il timestamp in modo che il prossimo interval conti da ora
                    active_sessions[user_id] = now

                except Exception as e:
                    print(f"[autosave] errore per user {user_id}: {e}")
            # sleep interval
            await asyncio.sleep(AUTO_SAVE_INTERVAL)
    except asyncio.CancelledError:
        print("[autosave] autosave_loop cancellata")
    except Exception as e:
        print("[autosave] ERRORE FATALE autosave_loop:", e)
        traceback.print_exc()

# -------------------------------
# HEARTBEAT PERIODICO
# -------------------------------
HEARTBEAT_INTERVAL = 30

async def heartbeat_loop():
    global heartbeat_task
    try:
        await bot.wait_until_ready()
        while not bot.is_closed():
            update_heartbeat()
            await asyncio.sleep(HEARTBEAT_INTERVAL)
    except asyncio.CancelledError:
        print("[heartbeat] heartbeat_loop cancellata")
    except Exception as e:
        print("[heartbeat] ERRORE FATALE heartbeat_loop:", e)
        traceback.print_exc()

def set_start_state(active: bool):
    try:
        r = requests.put(FIREBASE_URL_COMMANDS, json=bool(active), timeout=10)
        if r.status_code not in (200, 201):
            print(f"[commands] errore PUT {r.status_code}: {r.text}")
    except Exception as e:
        print(f"[commands] errore aggiornamento commands/start: {e}")
        traceback.print_exc()

async def command_loop():
    global command_task
    try:
        await bot.wait_until_ready()
        while not bot.is_closed():
            state = fetch_commands()
            if state is True:
                await handle_start_action()
            elif state is False:
                await handle_stop_action()
            await asyncio.sleep(2)
    except asyncio.CancelledError:
        print("[commands] command_loop cancellata")
    except Exception as e:
        print("[commands] ERRORE FATALE command_loop:", e)
        traceback.print_exc()

@bot.event
async def on_disconnect():
    set_bot_status(False)
    update_heartbeat()

def _handle_exit(*_):
    set_bot_status(False)

atexit.register(_handle_exit)
signal.signal(signal.SIGINT, _handle_exit)
signal.signal(signal.SIGTERM, _handle_exit)

# Funzione helper: converte tutti i numeri in stringhe ricorsivamente
def numbers_to_strings(obj):
    if isinstance(obj, dict):
        return {k: numbers_to_strings(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [numbers_to_strings(v) for v in obj]
    elif isinstance(obj, int):
        return str(obj)
    else:
        return obj        


# -------------------------------
# COMANDI
# -------------------------------
@bot.command()
async def start(ctx):
    refresh_controllers()
    # Check authorization
    if ctx.author.id not in CONTROL_USER_IDS:
        await send_unauthorized(ctx)
        return

    global kick_active, kick_task
    if kick_active:
        await ctx.send("Kick automatico già attivo ✅")
        return
    kick_active = True
    set_start_state(True)
    # start background task to monitor joins
    if kick_task is None or kick_task.done():
        kick_task = asyncio.create_task(kick_loop())
    await ctx.send("Kick automatico attivato ✅")

    # Immediate check: if any target is already in voice, kick after delay
    guild = bot.get_guild(GUILD_ID)
    if guild:
        refresh_targets()
        for target_id in TARGET_ID:
            member = guild.get_member(target_id)
            if member and member.voice and member.voice.channel:
                await ctx.send(f"{member.name} è già in call: kick tra {KICK_DELAY} secondi...")
                await asyncio.sleep(KICK_DELAY)
                try:
                    await member.move_to(None)
                    await ctx.send(f"{member.name} è stato kickato dalla call.")
                except Exception as e:
                    await ctx.send(f"ERRORE: {e}")

@bot.command()
async def stop(ctx):
    refresh_controllers()
    # Check authorization
    if ctx.author.id not in CONTROL_USER_IDS:
        await send_unauthorized(ctx)
        return

    global kick_active, kick_task
    if not kick_active:
        await ctx.send("Kick automatico già disattivato ❌")
        return
    kick_active = False
    set_start_state(False)
    # cancel background task if running
    if kick_task and not kick_task.done():
        kick_task.cancel()
        try:
            await kick_task
        except asyncio.CancelledError:
            pass
    kick_task = None
    await ctx.send("Kick automatico disattivato ❌")


@bot.command()
async def info(ctx):
    refresh_targets()
    guild = bot.get_guild(GUILD_ID)
    
    msg = "**🔍 TEST RISULTATI**\n"
    msg += f"- Guild trovata: {'SI' if guild else 'NO'}\n"
    msg += f"- Numero target: {len(TARGET_ID)}\n"
    msg += f"- Target IDs: {TARGET_ID}\n"
    msg += f"- GUILD_ID = {GUILD_ID}\n"
    
    if guild:
        for target_id in TARGET_ID:
            target = guild.get_member(target_id)
            if target:
                voice_channel = target.voice.channel.name if target.voice and target.voice.channel else "Nessuna"
                msg += f"\n  - {target.mention}: vocale={voice_channel}, in_channel={'SI' if target.voice and target.voice.channel else 'NO'}"
            else:
                msg += f"\n  - ID `{target_id}`: utente non trovato"

    await ctx.send(msg)


# -------------------------------
# RUNTIME COMMANDS
# -------------------------------
@bot.command()
async def ctarget(ctx, action: str, target_id: int):
    """Manage targets: add/remove/list. Examples: !ctarget add 123 or !ctarget remove 123"""
    refresh_controllers()
    if ctx.author.id not in CONTROL_USER_IDS:
        await send_unauthorized(ctx)
        return
    
    global TARGET_ID
    refresh_targets()
    action = action.lower()
    
    if action == "add":
        if target_id in TARGET_ID:
            await ctx.send(f"Target `{target_id}` è già nella lista.")
            return
        TARGET_ID.append(target_id)
        save_target(TARGET_ID)
        await ctx.send(f"Target `{target_id}` aggiunto. Lista: {TARGET_ID} ✅")
    
    elif action == "remove":
        if target_id not in TARGET_ID:
            await ctx.send(f"Target `{target_id}` non è nella lista.")
            return
        if len(TARGET_ID) <= 1:
            await ctx.send("Impossibile rimuovere l'ultimo target.")
            return
        TARGET_ID.remove(target_id)
        save_target(TARGET_ID)
        await ctx.send(f"Target `{target_id}` rimosso. Lista: {TARGET_ID} ✅")
    
    else:
        await ctx.send("Azione non riconosciuta. Usa 'add' o 'remove'.")


@bot.command()
async def addcontroller(ctx, user_id: int):
    """Add a user ID to the controller set. Only existing controllers can run this."""
    global CONTROL_USER_IDS
    refresh_controllers()
    if ctx.author.id not in CONTROL_USER_IDS:
        await send_unauthorized(ctx)
        return
    if user_id in CONTROL_USER_IDS:
        await ctx.send(f"L'utente `{user_id}` è già un controller.")
        return
    CONTROL_USER_IDS.add(user_id)
    save_controllers(CONTROL_USER_IDS)
    await ctx.send(f"Utente `{user_id}` aggiunto alla lista dei controller ✅")


@bot.command()
async def rmcontroller(ctx, user_id: int):
    """Remove a user ID from the controller set. Prevent removing the last controller."""
    global CONTROL_USER_IDS
    refresh_controllers()
    if ctx.author.id not in CONTROL_USER_IDS:
        await send_unauthorized(ctx)
        return
    if user_id not in CONTROL_USER_IDS:
        await ctx.send(f"L'utente `{user_id}` non è nella lista dei controller.")
        return
    if len(CONTROL_USER_IDS) <= 1:
        await ctx.send("Impossibile rimuovere l'ultimo controller.")
        return
    CONTROL_USER_IDS.remove(user_id)
    save_controllers(CONTROL_USER_IDS)
    await ctx.send(f"Utente `{user_id}` rimosso dalla lista dei controller ✅")

    # Comando esistente per dump completo
@bot.command()
async def test(ctx):
    guild = bot.get_guild(GUILD_ID)

    if guild is None:
        await ctx.send("❌ Guild NON trovata")
        return

    members_data = []
    for member in guild.members:
        members_data.append({
            "id": str(member.id),
            "username": member.name,
            "avatar": str(member.display_avatar.url)
        })

    data = {
        "guild": {
            "id": str(guild.id),
            "name": guild.name,
            "icon": str(guild.icon.url) if guild.icon else "",
            "member_count": str(guild.member_count),
            "text_channels": str(len(guild.text_channels)),
            "voice_channels": str(len(guild.voice_channels))
        },
        "members": members_data
    }

    data = numbers_to_strings(data)

    async with aiohttp.ClientSession() as session:
        async with session.put(FIREBASE_URL_GUILD, json=data) as resp:
            if resp.status >= 400:
                await ctx.send(f"❌ Firebase error: {resp.status}")
                return

    await ctx.message.add_reaction("✅")

# Evento per aggiungere automaticamente nuovi membri




# -------------------------------
# RUN BOT
# -------------------------------
bot.run(TOKEN)
