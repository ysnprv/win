REPO_PATH = "https://github.com/EpicDragon123/jobs_json"

from pathlib import Path
import asyncio
import json

from features.Job_matcher.src.storage.job_storage import JobStorageClient


async def import_database(input_file: str = "jobs_export.json", confirm: bool = False):
    """Import jobs from JSON file into database"""
    
    print("JOB DATABASE IMPORTER")
    print("=" * 60)
    
    try:
        # Check if file exists. input_file may be an absolute path.
        try:
            project_root  # type: ignore
        except NameError:
            # Compute project root in case caller doesn't import it elsewhere
            project_root = Path(__file__).resolve().parent.parent.parent.parent.parent

        input_path = Path(input_file) if Path(input_file).is_absolute() else Path(project_root) / input_file
        if not input_path.exists():
            print(f"File not found: {input_path}")
            return
        
        # Load export data
        print(f"\n[1] Loading data from {input_file}...")
        with open(input_path, 'r', encoding='utf-8') as f:
            export_data = json.load(f)
        
        total_jobs = export_data.get("total_jobs", 0)
        export_date = export_data.get("export_date", "unknown")
        
        print(f"Loaded export file")
        print(f"   Exported on: {export_date}")
        print(f"   Total jobs: {total_jobs}")
        
        # Initialize storage client
        print(f"\n[2] Initializing database connection...")
        storage = JobStorageClient()
        collection = storage.jobs_collection
        
        # Check current database state
        current_count = collection.count()
        print(f"   Current database contains: {current_count} jobs")
        
        # Ask for confirmation if database is not empty
        if current_count > 0 and not confirm:
            print(f"\nDatabase is not empty!")
            response = input(
                f"   Continue and add {total_jobs} jobs? This will merge with existing data. (yes/no): "
            )
            if response.lower() != "yes":
                print("Import cancelled by user")
                return
        
        # Import jobs
        print(f"\n[3] Importing jobs...")
        jobs_data = export_data.get("jobs", [])
        
        imported = 0
        skipped = 0
        errors = 0
        
        # Batch import for better performance
        batch_size = 50
        batches = [jobs_data[i:i + batch_size] for i in range(0, len(jobs_data), batch_size)]
        
        for batch_idx, batch in enumerate(batches):
            ids = []
            embeddings = []
            documents = []
            metadatas = []
            
            for job in batch:
                try:
                    job_id = job["id"]
                    
                    # Check if already exists
                    if storage.already_stored(job_id):
                        skipped += 1
                        continue
                    
                    ids.append(job_id)
                    # The JSON file contains precomputed embedding and document
                    # Use stored values if present, otherwise try to fallback
                    embeddings.append(job.get("embedding"))
                    documents.append(job.get("document") or job.get("description") or "")
                    metadatas.append(job.get("metadata") or {})
                    
                except Exception as e:
                    print(f"   Error preparing job: {e}")
                    errors += 1
            
            # Add batch to collection
            if ids:
                try:
                    collection.add(
                        ids=ids,
                        embeddings=embeddings,
                        documents=documents,
                        metadatas=metadatas
                    )
                    imported += len(ids)
                    
                    print(f"   Batch {batch_idx + 1}/{len(batches)}: Added {len(ids)} jobs (Total: {imported})")
                    
                except Exception as e:
                    print(f"   Batch {batch_idx + 1} failed: {e}")
                    errors += len(ids)
        
        # Final summary
        print(f"\nImport completed!")
        print(f"   Imported: {imported} jobs")
        print(f"   Skipped (duplicates): {skipped} jobs")
        if errors > 0:
            print(f"   Errors: {errors} jobs")
        
        # Verify final count
        final_count = collection.count()
        print(f"\n[4] Database now contains: {final_count} jobs")
        
    except Exception as e:
        print(f"Import failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Import jobs from JSON to database')
    parser.add_argument(
        '--input', 
        type=str, 
        default='jobs_export.json',
        help='Input file name (default: jobs_export.json)'
    )
    
    args = parser.parse_args()
    
    asyncio.run(import_database(args.input))
