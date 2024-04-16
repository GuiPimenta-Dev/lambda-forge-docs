import os
import time

# Function to calculate file size in bytes
def get_file_size(file_path):
    return os.path.getsize(file_path)

# Function to convert bytes to human-readable format
def convert_bytes(bytes):
    if bytes == 0:
        return "0B"
    size_suffixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    index = int((len(str(bytes)) - 1) / 3)
    return f"{bytes / (1024 ** index):.2f} {size_suffixes[index]}"

# Function to traverse the directory and find unused files
def find_unused_files(directory):
    unused_files = []
    total_space_freed = 0

    # Get the current time
    current_time = time.time()

    # Define the threshold for "unused" (e.g., 6 months)
    threshold = 6 * 30 * 24 * 60 * 60  # 6 months in seconds

    # Traverse the directory and check each file
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            # Get the last access time of the file
            try:
              last_access_time = os.path.getatime(file_path)
              # Calculate the time difference
              time_diff = current_time - last_access_time
              # Check if the file is unused and not essential
              if time_diff > threshold and not is_essential_file(file_path):
                  os.remove(file_path)
                  unused_files.append(file_path)
                  total_space_freed += get_file_size(file_path)
            except:
              pass

    return unused_files, total_space_freed

# Function to check if a file is essential for the software's operation
def is_essential_file(file_path):
    # You can define your own criteria for essential files here
    # For demonstration purposes, we assume files with certain extensions are essential
    essential_extensions = ['.app', '.framework', '.dylib']  # Example essential extensions
    _, file_extension = os.path.splitext(file_path)
    return file_extension.lower() in essential_extensions

# Main function
def main():
    # Specify the directory you want to scan
    directory_to_scan = "/Users/guialves"  # Example directory

    # Find unused files
    unused_files, total_space_freed = find_unused_files(directory_to_scan)

    # Print the unused files and total space freed
    print("Unused Files:")
    for file_path in unused_files:
        print(file_path)
    
    with open('unused_files.txt', 'w') as f:
      for file_path in unused_files:
        f.write(file_path + '\n')
    print("\nTotal Space Freed:", convert_bytes(total_space_freed))

if __name__ == "__main__":
    main()
